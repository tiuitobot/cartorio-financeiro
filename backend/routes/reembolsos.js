// routes/reembolsos.js
const router = require('express').Router();
const db = require('../db');
const { authMiddleware, requirePerfil } = require('../middleware/auth');
const { buildReembolsosScope } = require('../lib/list-scopes');
const {
  createReembolsoContestacaoPendencia,
  resolveReembolsoContestacaoPendencia,
} = require('../lib/pendencias');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const scope = buildReembolsosScope(req.user);
    if (scope.error) return res.status(403).json({ erro: scope.error });

    const { rows } = await db.query(`
      SELECT p.*, e.nome AS escrevente_nome
      FROM pagamentos_reembolso p
      LEFT JOIN escreventes e ON p.escrevente_id = e.id
      ${scope.where}
      ORDER BY p.data DESC`, scope.params);
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
});

router.post('/', authMiddleware, requirePerfil('admin','financeiro','chefe_financeiro'), async (req, res) => {
  const { escrevente_id, data, valor, notas } = req.body;
  if (!escrevente_id || !data || !valor) return res.status(400).json({ erro: 'Campos obrigatórios' });
  try {
    const { rows } = await db.query(
      'INSERT INTO pagamentos_reembolso(escrevente_id,data,valor,notas) VALUES($1,$2,$3,$4) RETURNING *',
      [escrevente_id, data, valor, notas||null]
    );
    res.status(201).json(rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
});

router.put('/:id/confirmar', authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id);
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { rows: pgto } = await client.query('SELECT * FROM pagamentos_reembolso WHERE id=$1 FOR UPDATE', [id]);
    if (!pgto.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ erro: 'Pagamento não encontrado' });
    }
    const isAdmin = ['admin','financeiro','chefe_financeiro'].includes(req.user.perfil);
    const isOwner = req.user.escrevente_id === pgto[0].escrevente_id;
    if (!isAdmin && !isOwner) {
      await client.query('ROLLBACK');
      return res.status(403).json({ erro: 'Permissão insuficiente' });
    }
    const { rows } = await client.query(
      `UPDATE pagamentos_reembolso
          SET confirmado_escrevente=true,
              confirmado_em=NOW(),
              contestado_escrevente=false,
              contestacao_justificativa=NULL,
              contestado_em=NULL
        WHERE id=$1
        RETURNING *`, [id]
    );
    await resolveReembolsoContestacaoPendencia(client, id, req.user.id || null);
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ erro: 'Erro interno' });
  } finally {
    client.release();
  }
});

router.put('/:id/contestar', authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const justificativa = String(req.body?.justificativa || '').trim();
  if (!justificativa) return res.status(400).json({ erro: 'Justificativa obrigatória' });

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { rows: pgto } = await client.query('SELECT * FROM pagamentos_reembolso WHERE id=$1 FOR UPDATE', [id]);
    if (!pgto.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ erro: 'Pagamento não encontrado' });
    }

    const isOwner = req.user.escrevente_id === pgto[0].escrevente_id;
    if (!isOwner) {
      await client.query('ROLLBACK');
      return res.status(403).json({ erro: 'Permissão insuficiente' });
    }

    const { rows } = await client.query(
      `UPDATE pagamentos_reembolso
          SET confirmado_escrevente=false,
              contestado_escrevente=true,
              contestacao_justificativa=$2,
              contestado_em=NOW()
        WHERE id=$1
        RETURNING *`,
      [id, justificativa]
    );
    await createReembolsoContestacaoPendencia(client, {
      pagamento: rows[0],
      user: req.user,
      justificativa,
    });
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ erro: 'Erro interno' });
  } finally {
    client.release();
  }
});

module.exports = router;
