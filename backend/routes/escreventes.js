const router = require('express').Router();
const db = require('../db');
const { authMiddleware, requirePerfil } = require('../middleware/auth');

const ADMIN_FIN = ['admin', 'chefe_financeiro', 'financeiro'];

async function fetchEscreventeById(dbClient, id) {
  const { rows } = await dbClient.query(`
    SELECT e.*,
      COALESCE(
        json_agg(ec.compartilha_com_id) FILTER (WHERE ec.compartilha_com_id IS NOT NULL), '[]'
      ) AS compartilhar_com
    FROM escreventes e
    LEFT JOIN escreventes_compartilhamento ec ON ec.escrevente_id = e.id
    WHERE e.id = $1
    GROUP BY e.id
  `, [id]);

  return rows[0] || null;
}

// GET /api/escreventes
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT e.*,
        COALESCE(
          json_agg(ec.compartilha_com_id) FILTER (WHERE ec.compartilha_com_id IS NOT NULL), '[]'
        ) AS compartilhar_com
      FROM escreventes e
      LEFT JOIN escreventes_compartilhamento ec ON ec.escrevente_id = e.id
      WHERE e.ativo = true
      GROUP BY e.id
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
  if (!nome || ![6,20,30].includes(parseInt(taxa)))
    return res.status(400).json({ erro: 'Nome e taxa (6, 20 ou 30) obrigatórios' });
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'INSERT INTO escreventes(nome,cargo,email,taxa) VALUES($1,$2,$3,$4) RETURNING *',
      [nome, cargo||null, email||null, parseInt(taxa)]
    );
    const novo = rows[0];
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
      await client.query(
        'UPDATE escreventes SET nome=$1,cargo=$2,email=$3,taxa=$4 WHERE id=$5',
        [nome, cargo||null, email||null, parseInt(taxa), id]
      );
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
