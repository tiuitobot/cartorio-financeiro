const router = require('express').Router();
const db = require('../db');
const { authMiddleware, requirePerfil } = require('../middleware/auth');
const {
  enrichDespesaRegistroRow,
  normalizeDespesaRegistroPayload,
  validateDespesaRegistroPayload,
} = require('../lib/despesas-registro');

const PERFIS_AUTORIZADOS = ['admin', 'financeiro', 'chefe_financeiro', 'auxiliar_registro'];
const DESPESA_REGISTRO_SELECT = `
  SELECT
    d.*,
    u.nome AS criado_por_nome,
    a.id AS ato_vinculado_id,
    a.livro AS ato_vinculado_livro,
    a.pagina AS ato_vinculado_pagina,
    a.status AS ato_vinculado_status,
    a.data_pagamento AS ato_vinculado_data_pagamento
  FROM despesas_registro d
  LEFT JOIN usuarios u ON u.id = d.criado_por_user_id
  LEFT JOIN LATERAL (
    SELECT ato.id, ato.livro, ato.pagina, ato.status, ato.data_pagamento
      FROM atos ato
     WHERE ato.controle = d.controle_ref
     ORDER BY ato.id DESC
     LIMIT 1
  ) a ON TRUE
`;

async function loadDespesaRegistroById(id) {
  const { rows } = await db.query(
    `${DESPESA_REGISTRO_SELECT}
      WHERE d.id = $1`,
    [id]
  );
  return rows[0] ? enrichDespesaRegistroRow(rows[0]) : null;
}

router.get('/', authMiddleware, requirePerfil(...PERFIS_AUTORIZADOS), async (req, res) => {
  try {
    const { rows } = await db.query(
      `${DESPESA_REGISTRO_SELECT}
       ORDER BY d.data_registro DESC, d.created_at DESC, d.id DESC`
    );
    res.json(rows.map(enrichDespesaRegistroRow));
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

router.post('/', authMiddleware, requirePerfil(...PERFIS_AUTORIZADOS), async (req, res) => {
  const payload = normalizeDespesaRegistroPayload(req.body);
  const validationError = validateDespesaRegistroPayload(payload);
  if (validationError) return res.status(400).json({ erro: validationError });

  try {
    const { rows } = await db.query(
      `INSERT INTO despesas_registro(
         controle_ref, data_registro, valor, descricao,
         cartorio_nome, protocolo, observacoes, criado_por_user_id
       ) VALUES($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id`,
      [
        payload.controle_ref,
        payload.data_registro,
        payload.valor,
        payload.descricao,
        payload.cartorio_nome,
        payload.protocolo,
        payload.observacoes,
        req.user.id || null,
      ]
    );
    const created = await loadDespesaRegistroById(rows[0].id);
    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

router.put('/:id', authMiddleware, requirePerfil(...PERFIS_AUTORIZADOS), async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const payload = normalizeDespesaRegistroPayload(req.body);
  const validationError = validateDespesaRegistroPayload(payload);
  if (validationError) return res.status(400).json({ erro: validationError });

  try {
    const { rows } = await db.query(
      `UPDATE despesas_registro
          SET controle_ref = $1,
              data_registro = $2,
              valor = $3,
              descricao = $4,
              cartorio_nome = $5,
              protocolo = $6,
              observacoes = $7
        WHERE id = $8
        RETURNING id`,
      [
        payload.controle_ref,
        payload.data_registro,
        payload.valor,
        payload.descricao,
        payload.cartorio_nome,
        payload.protocolo,
        payload.observacoes,
        id,
      ]
    );

    if (!rows[0]) return res.status(404).json({ erro: 'Despesa de registro não encontrada' });
    const updated = await loadDespesaRegistroById(rows[0].id);
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

router.delete('/:id', authMiddleware, requirePerfil(...PERFIS_AUTORIZADOS), async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);

  try {
    const { rowCount } = await db.query(
      'DELETE FROM despesas_registro WHERE id = $1',
      [id]
    );
    if (!rowCount) return res.status(404).json({ erro: 'Despesa de registro não encontrada' });
    res.status(204).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

module.exports = router;
