const router = require('express').Router();
const db = require('../db');
const { authMiddleware, requirePerfil } = require('../middleware/auth');
const {
  todayDateString,
  normalizeVigenciaInicio,
  upsertTaxaHistorico,
  fetchEffectiveTaxaAtDate,
} = require('../lib/taxas-historico');

const ADMIN_FIN = ['admin', 'chefe_financeiro', 'financeiro'];

async function fetchEscreventeById(dbClient, id) {
  const { rows } = await dbClient.query(`
    SELECT
      e.id,
      e.nome,
      e.cargo,
      e.email,
      COALESCE(current_hist.taxa, e.taxa) AS taxa,
      e.taxa AS taxa_cadastrada,
      e.ativo,
      e.created_at,
      e.updated_at,
      COALESCE(comp.compartilhar_com, '[]'::json) AS compartilhar_com,
      COALESCE(hist.taxas_historico, '[]'::json) AS taxas_historico
    FROM escreventes e
    LEFT JOIN LATERAL (
      SELECT json_agg(ec.compartilha_com_id ORDER BY ec.compartilha_com_id) AS compartilhar_com
      FROM escreventes_compartilhamento ec
      WHERE ec.escrevente_id = e.id
    ) comp ON TRUE
    LEFT JOIN LATERAL (
      SELECT json_agg(row_to_json(item) ORDER BY item.vigencia_inicio DESC, item.id DESC) AS taxas_historico
      FROM (
        SELECT h.id, h.taxa, h.vigencia_inicio, h.created_at, h.created_by_user_id
        FROM escreventes_taxas_historico h
        WHERE h.escrevente_id = e.id
      ) item
    ) hist ON TRUE
    LEFT JOIN LATERAL (
      SELECT h.taxa
      FROM escreventes_taxas_historico h
      WHERE h.escrevente_id = e.id
        AND h.vigencia_inicio <= CURRENT_DATE
      ORDER BY h.vigencia_inicio DESC, h.id DESC
      LIMIT 1
    ) current_hist ON TRUE
    WHERE e.id = $1
  `, [id]);

  return rows[0] || null;
}

// GET /api/escreventes
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        e.id,
        e.nome,
        e.cargo,
        e.email,
        COALESCE(current_hist.taxa, e.taxa) AS taxa,
        e.taxa AS taxa_cadastrada,
        e.ativo,
        e.created_at,
        e.updated_at,
        COALESCE(comp.compartilhar_com, '[]'::json) AS compartilhar_com,
        COALESCE(hist.taxas_historico, '[]'::json) AS taxas_historico
      FROM escreventes e
      LEFT JOIN LATERAL (
        SELECT json_agg(ec.compartilha_com_id ORDER BY ec.compartilha_com_id) AS compartilhar_com
        FROM escreventes_compartilhamento ec
        WHERE ec.escrevente_id = e.id
      ) comp ON TRUE
      LEFT JOIN LATERAL (
        SELECT json_agg(row_to_json(item) ORDER BY item.vigencia_inicio DESC, item.id DESC) AS taxas_historico
        FROM (
          SELECT h.id, h.taxa, h.vigencia_inicio, h.created_at, h.created_by_user_id
          FROM escreventes_taxas_historico h
          WHERE h.escrevente_id = e.id
        ) item
      ) hist ON TRUE
      LEFT JOIN LATERAL (
        SELECT h.taxa
        FROM escreventes_taxas_historico h
        WHERE h.escrevente_id = e.id
          AND h.vigencia_inicio <= CURRENT_DATE
        ORDER BY h.vigencia_inicio DESC, h.id DESC
        LIMIT 1
      ) current_hist ON TRUE
      WHERE e.ativo = true
      ORDER BY e.nome
    `);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// POST /api/escreventes
router.post('/', authMiddleware, requirePerfil('admin'), async (req, res) => {
  const { nome, cargo, email, taxa, compartilhar_com = [] } = req.body;
  const taxaInt = Number.parseInt(taxa, 10);
  if (!nome || ![6,20,30].includes(taxaInt))
    return res.status(400).json({ erro: 'Nome e taxa (6, 20 ou 30) obrigatórios' });
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'INSERT INTO escreventes(nome,cargo,email,taxa) VALUES($1,$2,$3,$4) RETURNING *',
      [nome, cargo||null, email||null, taxaInt]
    );
    const novo = rows[0];
    await upsertTaxaHistorico(client, {
      escreventeId: novo.id,
      taxa: taxaInt,
      vigenciaInicio: todayDateString(),
      createdByUserId: req.user.id || null,
    });
    for (const cid of compartilhar_com) {
      await client.query(
        'INSERT INTO escreventes_compartilhamento VALUES($1,$2) ON CONFLICT DO NOTHING',
        [novo.id, cid]
      );
    }
    await client.query('COMMIT');
    const escrevente = await fetchEscreventeById(db, novo.id);
    res.status(201).json(escrevente);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ erro: 'Erro interno' });
  } finally { client.release(); }
});

// PUT /api/escreventes/:id
router.put('/:id', authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id);
  const isAdmin = req.user.perfil === 'admin';
  const isOwner = req.user.escrevente_id === id;
  if (!isAdmin && !isOwner) return res.status(403).json({ erro: 'Permissão insuficiente' });

  const { nome, cargo, email, taxa, compartilhar_com = [] } = req.body;
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const existente = await fetchEscreventeById(client, id);
    if (!existente) {
      await client.query('ROLLBACK');
      return res.status(404).json({ erro: 'Escrevente não encontrado' });
    }

    if (isAdmin) {
      const taxaInt = Number.parseInt(taxa, 10);
      if (![6,20,30].includes(taxaInt)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ erro: 'Nome e taxa (6, 20 ou 30) obrigatórios' });
      }
      const vigenciaInicio = normalizeVigenciaInicio(req.body.taxa_vigencia_inicio) || todayDateString();
      const taxaNaVigencia = await fetchEffectiveTaxaAtDate(client, id, vigenciaInicio, existente.taxa);

      await client.query(
        'UPDATE escreventes SET nome=$1,cargo=$2,email=$3,taxa=$4 WHERE id=$5',
        [nome, cargo||null, email||null, vigenciaInicio <= todayDateString() ? taxaInt : existente.taxa_cadastrada, id]
      );

      if (taxaInt !== taxaNaVigencia) {
        await upsertTaxaHistorico(client, {
          escreventeId: id,
          taxa: taxaInt,
          vigenciaInicio,
          createdByUserId: req.user.id || null,
        });
      }
    } else {
      // Escrevente só pode atualizar compartilhamentos
    }
    // Atualiza compartilhamentos
    await client.query('DELETE FROM escreventes_compartilhamento WHERE escrevente_id=$1', [id]);
    for (const cid of compartilhar_com) {
      await client.query(
        'INSERT INTO escreventes_compartilhamento VALUES($1,$2) ON CONFLICT DO NOTHING',
        [id, cid]
      );
    }
    await client.query('COMMIT');
    const escrevente = await fetchEscreventeById(db, id);
    res.json(escrevente);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ erro: 'Erro interno' });
  } finally { client.release(); }
});

module.exports = router;
