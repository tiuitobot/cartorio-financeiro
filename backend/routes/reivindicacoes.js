const router = require('express').Router();
const db = require('../db');
const { authMiddleware, requirePerfil } = require('../middleware/auth');
const { formatDatePtBr } = require('../lib/audit');
const { buildReivindicacoesScope } = require('../lib/list-scopes');
const { normalizeControle, upsertOpenPendencia } = require('../lib/pendencias');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const scope = buildReivindicacoesScope(req.user);
    if (scope.error) return res.status(403).json({ erro: scope.error });

    const { rows } = await db.query(`
      SELECT r.*, e.nome AS escrevente_nome_atual
      FROM reivindicacoes r
      LEFT JOIN atos a ON r.ato_id = a.id
      LEFT JOIN escreventes e ON r.escrevente_id = e.id
      ${scope.where}
      ORDER BY r.created_at DESC`, scope.params);
    res.json(rows);
  } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
});

router.post('/', authMiddleware, requirePerfil('escrevente'), async (req, res) => {
  const { ato_id, funcao } = req.body;
  if (!ato_id || !['executor','signatario'].includes(funcao))
    return res.status(400).json({ erro: 'Dados inválidos' });
  const eid = req.user.escrevente_id;
  if (!eid) return res.status(403).json({ erro: 'Usuário não vinculado a escrevente' });
  try {
    // Verifica se ato existe e se escrevente já está nele
    const { rows: ato } = await db.query('SELECT * FROM atos WHERE id=$1', [ato_id]);
    if (!ato.length) return res.status(404).json({ erro: 'Ato não encontrado' });
    if ([ato[0].captador_id, ato[0].executor_id, ato[0].signatario_id].includes(eid))
      return res.status(409).json({ erro: 'Você já está registrado neste ato' });
    const { rows } = await db.query(`
      INSERT INTO reivindicacoes(ato_id,escrevente_id,escrevente_nome,funcao,data,status)
      VALUES($1,$2,$3,$4,$5,'pendente') RETURNING *`,
      [ato_id, eid, req.user.nome, funcao, formatDatePtBr()]
    );
    res.status(201).json(rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
});

router.put('/:id', authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id);
  const { status, justificativa, decisao_financeiro } = req.body;
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { rows: reiv } = await client.query('SELECT * FROM reivindicacoes WHERE id=$1 FOR UPDATE', [id]);
    if (!reiv.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ erro: 'Reivindicação não encontrada' });
    }
    const r = reiv[0];
    const perfil = req.user.perfil;
    const eid = req.user.escrevente_id;

    // Captador responde (aceita ou recusa)
    if (status === 'aceita' || status === 'recusada') {
      const { rows: ato } = await client.query('SELECT captador_id FROM atos WHERE id=$1', [r.ato_id]);
      if (!ato.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ erro: 'Ato não encontrado' });
      }
      const isCaptador = ato[0].captador_id === eid;
      const isAdmin = ['admin','financeiro','chefe_financeiro'].includes(perfil);
      if (!isCaptador && !isAdmin) {
        await client.query('ROLLBACK');
        return res.status(403).json({ erro: 'Somente o captador pode responder' });
      }
      if (status === 'aceita') {
        if (r.funcao === 'executor') {
          await client.query('UPDATE atos SET executor_id=$1 WHERE id=$2', [r.escrevente_id, r.ato_id]);
        } else {
          await client.query('UPDATE atos SET signatario_id=$1 WHERE id=$2', [r.escrevente_id, r.ato_id]);
        }
      }
    }
    // Escrevente contesta recusa
    if (status === 'contestada') {
      if (eid !== r.escrevente_id) {
        await client.query('ROLLBACK');
        return res.status(403).json({ erro: 'Permissão insuficiente' });
      }
    }
    // Financeiro decide contestação
    if (status === 'aceita_financeiro' || status === 'negada_financeiro') {
      if (!['admin','financeiro','chefe_financeiro'].includes(perfil))
        {
          await client.query('ROLLBACK');
          return res.status(403).json({ erro: 'Permissão insuficiente' });
        }
      if (status === 'aceita_financeiro') {
        if (r.funcao === 'executor') {
          await client.query('UPDATE atos SET executor_id=$1 WHERE id=$2', [r.escrevente_id, r.ato_id]);
        } else {
          await client.query('UPDATE atos SET signatario_id=$1 WHERE id=$2', [r.escrevente_id, r.ato_id]);
        }
      }
    }
    const { rows } = await client.query(
      `UPDATE reivindicacoes SET status=$1,justificativa=$2,decisao_financeiro=$3 WHERE id=$4 RETURNING *`,
      [status, justificativa||r.justificativa, decisao_financeiro||r.decisao_financeiro, id]
    );
    if (status === 'contestada') {
      const { rows: atoRows } = await client.query(
        'SELECT id, controle, data_ato FROM atos WHERE id = $1',
        [r.ato_id]
      );
      const ato = atoRows[0];
      if (ato) {
        await upsertOpenPendencia(client, {
          ato_id: ato.id,
          tipo: 'manifestacao_escrevente',
          descricao: `Contestação de reivindicação para ${r.funcao}: ${justificativa || 'sem justificativa informada'}`,
          escrevente_id: r.escrevente_id,
          origem: 'escrevente',
          controle_ref: normalizeControle(ato.controle),
          data_ato_ref: ato.data_ato,
          criado_por_user_id: req.user.id || null,
          chave_unica: `reivindicacao:${r.id}:contestada`,
          metadata: {
            reivindicacao_id: r.id,
            funcao: r.funcao,
            justificativa: justificativa || r.justificativa || null,
          },
        });
      }
    }
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ erro: 'Erro interno' });
  } finally {
    client.release();
  }
});

module.exports = router;
