const router = require('express').Router();
const db = require('../db');
const { authMiddleware, requirePerfil } = require('../middleware/auth');
const {
  createManifestacaoPendencia,
  normalizeControle,
  serializePendencia,
} = require('../lib/pendencias');

const PENDENCIA_SELECT = `
  SELECT
    p.*,
    a.controle AS ato_controle,
    a.livro AS ato_livro,
    a.pagina AS ato_pagina,
    a.data_ato AS ato_data_ato,
    a.tipo_ato AS ato_tipo_ato,
    a.captador_id AS ato_captador_id,
    a.executor_id AS ato_executor_id,
    a.signatario_id AS ato_signatario_id,
    e.nome AS escrevente_nome
  FROM pendencias p
  LEFT JOIN atos a ON a.id = p.ato_id
  LEFT JOIN escreventes e ON e.id = p.escrevente_id
`;

function staleSolvedWindowClause() {
  return `(p.solucionado = false OR p.solucionado_em >= NOW() - INTERVAL '30 days')`;
}

async function fetchPendenciaRowById(queryable, pendenciaId) {
  const { rows } = await queryable.query(
    `${PENDENCIA_SELECT}
      WHERE p.id = $1`,
    [pendenciaId]
  );
  return rows[0] || null;
}

router.get('/', authMiddleware, requirePerfil('admin', 'financeiro', 'chefe_financeiro', 'escrevente'), async (req, res) => {
  const {
    tipo,
    escrevente_id,
    controle,
    inicio,
    fim,
    status = 'abertas',
  } = req.query;

  if (req.user.perfil === 'escrevente' && !req.user.escrevente_id) {
    return res.status(403).json({ erro: 'Usuário não vinculado a escrevente' });
  }

  try {
    const where = ['p.visivel = true', staleSolvedWindowClause()];
    const params = [];
    let i = 1;

    if (status === 'abertas') {
      where.push('p.solucionado = false');
    } else if (status === 'solucionadas') {
      where.push('p.solucionado = true');
    }

    if (tipo) {
      where.push(`p.tipo = $${i++}`);
      params.push(tipo);
    }

    if (escrevente_id) {
      where.push(`(
        p.escrevente_id = $${i}
        OR a.captador_id = $${i}
        OR a.executor_id = $${i}
        OR a.signatario_id = $${i}
      )`);
      params.push(Number.parseInt(escrevente_id, 10));
      i += 1;
    }

    if (controle) {
      const normalized = normalizeControle(controle);
      where.push(`(COALESCE(p.controle_ref, a.controle) = $${i} OR COALESCE(p.controle_ref, a.controle) LIKE $${i + 1})`);
      params.push(normalized || String(controle), `%${String(controle).replace(/\D/g, '')}%`);
      i += 2;
    }

    if (inicio) {
      where.push(`COALESCE(p.data_ato_ref, a.data_ato) >= $${i++}`);
      params.push(inicio);
    }

    if (fim) {
      where.push(`COALESCE(p.data_ato_ref, a.data_ato) <= $${i++}`);
      params.push(fim);
    }

    if (req.user.perfil === 'escrevente') {
      where.push(`(
        p.escrevente_id = $${i}
        OR a.captador_id = $${i}
        OR a.executor_id = $${i}
        OR a.signatario_id = $${i}
      )`);
      params.push(req.user.escrevente_id);
      i += 1;
    }

    const { rows } = await db.query(
      `${PENDENCIA_SELECT}
        WHERE ${where.join(' AND ')}
        ORDER BY
          CASE WHEN p.solucionado THEN 1 ELSE 0 END ASC,
          CASE WHEN p.solucionado THEN p.solucionado_em END DESC NULLS LAST,
          CASE WHEN p.solucionado = false THEN p.criado_em END ASC NULLS LAST,
          p.id ASC`,
      params
    );

    res.json(rows.map((row) => serializePendencia(row, req.user)));
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

router.post('/manifestar', authMiddleware, requirePerfil('escrevente'), async (req, res) => {
  const controle = normalizeControle(req.body?.controle);
  const mensagem = req.body?.mensagem;
  const confirmarSemRelacao = req.body?.confirmar_sem_relacao === true;

  if (!controle) {
    return res.status(400).json({ erro: 'Controle obrigatório' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const { rows: atos } = await client.query(
      'SELECT id, controle, livro, pagina, data_ato, captador_id, executor_id, signatario_id FROM atos WHERE controle = $1 LIMIT 1',
      [controle]
    );

    if (!atos.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ erro: 'Ato não encontrado para o controle informado' });
    }

    const result = await createManifestacaoPendencia(client, {
      ato: atos[0],
      user: req.user,
      mensagem,
      confirmarSemRelacao,
    });

    if (result.error) {
      await client.query('ROLLBACK');
      return res.status(400).json({ erro: result.error });
    }

    if (result.requiresConfirmation) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        erro: 'Esse controle não está relacionado ao seu nome. Deseja continuar?',
        requer_confirmacao: true,
        ato: result.ato,
      });
    }

    await client.query('COMMIT');
    const pendencia = await fetchPendenciaRowById(db, result.pendencia.id);
    return res.status(201).json(serializePendencia(pendencia, req.user));
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return res.status(500).json({ erro: 'Erro interno' });
  } finally {
    client.release();
  }
});

router.put('/:id', authMiddleware, requirePerfil('admin', 'financeiro', 'chefe_financeiro'), async (req, res) => {
  const pendenciaId = Number.parseInt(req.params.id, 10);
  const solucionado = req.body?.solucionado === true;
  const resolucao = req.body?.resolucao ? String(req.body.resolucao).trim() : null;

  if (!Number.isInteger(pendenciaId)) {
    return res.status(400).json({ erro: 'Pendência inválida' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const pendencia = await fetchPendenciaRowById(client, pendenciaId);
    if (!pendencia) {
      await client.query('ROLLBACK');
      return res.status(404).json({ erro: 'Pendência não encontrada' });
    }

    const metadata = pendencia.metadata || {};
    if (!solucionado && pendencia.origem === 'automatica') {
      await client.query('ROLLBACK');
      return res.status(409).json({
        erro: 'Pendências automáticas devem ser reabertas na origem do problema',
      });
    }

    const { rows } = await client.query(
      `UPDATE pendencias
          SET solucionado = $2,
              solucionado_em = CASE WHEN $2 THEN NOW() ELSE NULL END,
              solucionado_por_user_id = CASE WHEN $2 THEN $3::integer ELSE NULL END,
              resolucao = CASE WHEN $2 THEN COALESCE($4::text, resolucao, 'Marcada como solucionada') ELSE NULL END
        WHERE id = $1
        RETURNING *`,
      [pendenciaId, solucionado, req.user.id || null, resolucao]
    );

    if (metadata.correcao_id) {
      await client.query(
        `UPDATE correcoes
            SET status = $2
          WHERE id = $1`,
        [metadata.correcao_id, solucionado ? 'aprovado' : 'aguardando']
      );
    }

    await client.query('COMMIT');
    const updated = await fetchPendenciaRowById(db, rows[0].id);
    return res.json(serializePendencia(updated, req.user));
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    return res.status(500).json({ erro: 'Erro interno' });
  } finally {
    client.release();
  }
});

router.put('/:id/ocultar', authMiddleware, requirePerfil('admin', 'financeiro', 'chefe_financeiro'), async (req, res) => {
  const pendenciaId = Number.parseInt(req.params.id, 10);

  if (!Number.isInteger(pendenciaId)) {
    return res.status(400).json({ erro: 'Pendência inválida' });
  }

  try {
    const { rows } = await db.query(
      `UPDATE pendencias
          SET visivel = false
        WHERE id = $1
        RETURNING id`,
      [pendenciaId]
    );

    if (!rows.length) {
      return res.status(404).json({ erro: 'Pendência não encontrada' });
    }

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: 'Erro interno' });
  }
});

module.exports = router;
