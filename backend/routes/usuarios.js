// routes/usuarios.js
const router = require('express').Router();
const bcrypt = require('bcrypt');
const db = require('../db');
const { authMiddleware, requirePerfil } = require('../middleware/auth');
const { mergeUserPreferences, sanitizeUserPreferences } = require('../lib/user-preferences');

async function fetchUserPreferences(userId) {
  const { rows } = await db.query(
    'SELECT preferencias FROM usuarios_preferencias WHERE user_id = $1',
    [userId]
  );
  return sanitizeUserPreferences(rows[0]?.preferencias || {});
}

router.get('/preferencias', authMiddleware, async (req, res) => {
  try {
    const preferencias = await fetchUserPreferences(req.user.id);
    res.json(preferencias);
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

router.put('/preferencias', authMiddleware, async (req, res) => {
  try {
    const payload = req.body?.preferencias && typeof req.body.preferencias === 'object'
      ? req.body.preferencias
      : req.body;
    const preferenciasAtuais = await fetchUserPreferences(req.user.id);
    const preferencias = mergeUserPreferences(preferenciasAtuais, payload);

    const { rows } = await db.query(
      `INSERT INTO usuarios_preferencias(user_id, preferencias)
       VALUES($1, $2::jsonb)
       ON CONFLICT(user_id)
       DO UPDATE SET preferencias = EXCLUDED.preferencias
       RETURNING preferencias`,
      [req.user.id, JSON.stringify(preferencias)]
    );

    res.json(sanitizeUserPreferences(rows[0]?.preferencias || preferencias));
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

router.get('/', authMiddleware, requirePerfil('admin'), async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id,nome,email,perfil,escrevente_id,precisa_trocar_senha,ativo,created_at FROM usuarios ORDER BY nome'
    );
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
});

router.post('/', authMiddleware, requirePerfil('admin'), async (req, res) => {
  const { nome, email, senha, perfil, escrevente_id } = req.body;
  if (!nome || !email || !senha || !perfil)
    return res.status(400).json({ erro: 'Campos obrigatórios: nome, email, senha, perfil' });
  if (senha.length < 6) return res.status(400).json({ erro: 'Senha mínima: 6 caracteres' });
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const hash = await bcrypt.hash(senha, 12);
    const { rows } = await db.query(
      `INSERT INTO usuarios(nome,email,senha_hash,perfil,escrevente_id,precisa_trocar_senha)
       VALUES($1,$2,$3,$4,$5,true)
       RETURNING id,nome,email,perfil,escrevente_id,precisa_trocar_senha,ativo`,
      [nome, normalizedEmail, hash, perfil, escrevente_id||null]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ erro: 'E-mail já cadastrado' });
    console.error(e); res.status(500).json({ erro: 'Erro interno' });
  }
});

router.put('/:id', authMiddleware, requirePerfil('admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  const { nome, email, perfil, escrevente_id, ativo, nova_senha } = req.body;
  try {
    const normalizedEmail = email.trim().toLowerCase();
    if (nova_senha && nova_senha.length >= 6) {
      const hash = await bcrypt.hash(nova_senha, 12);
      await db.query(
        'UPDATE usuarios SET senha_hash=$1, precisa_trocar_senha=true WHERE id=$2',
        [hash, id]
      );
    }
    const { rows } = await db.query(
      `UPDATE usuarios
          SET nome=$1,email=$2,perfil=$3,escrevente_id=$4,ativo=$5
        WHERE id=$6
        RETURNING id,nome,email,perfil,escrevente_id,precisa_trocar_senha,ativo`,
      [nome, normalizedEmail, perfil, escrevente_id||null, ativo!==false, id]
    );
    res.json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ erro: 'E-mail já cadastrado' });
    console.error(e); res.status(500).json({ erro: 'Erro interno' });
  }
});

module.exports = router;
