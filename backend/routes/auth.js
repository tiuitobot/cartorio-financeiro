const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

function buildAuthUser(user) {
  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    perfil: user.perfil,
    escrevente_id: user.escrevente_id,
    precisa_trocar_senha: user.precisa_trocar_senha === true,
  };
}

function buildAuthToken(user) {
  return jwt.sign(
    buildAuthUser(user),
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ erro: 'E-mail e senha obrigatórios' });
  const normalizedEmail = email.trim().toLowerCase();
  try {
    const { rows } = await db.query(
      `SELECT u.*, e.nome as escrevente_nome
       FROM usuarios u LEFT JOIN escreventes e ON u.escrevente_id = e.id
       WHERE u.email = $1 AND u.ativo = true`, [normalizedEmail]
    );
    if (!rows.length) return res.status(401).json({ erro: 'Credenciais inválidas' });
    const user = rows[0];
    const ok = await bcrypt.compare(senha, user.senha_hash);
    if (!ok) return res.status(401).json({ erro: 'Credenciais inválidas' });
    const token = buildAuthToken(user);
    res.json({ token, user: buildAuthUser(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, nome, email, perfil, escrevente_id, precisa_trocar_senha FROM usuarios WHERE id = $1',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ erro: 'Usuário não encontrado' });
    res.json(buildAuthUser(rows[0]));
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

// PUT /api/auth/senha
router.put('/senha', authMiddleware, async (req, res) => {
  const { senha_atual, nova_senha } = req.body;
  if (!senha_atual || !nova_senha || nova_senha.length < 6)
    return res.status(400).json({ erro: 'Nova senha deve ter no mínimo 6 caracteres' });
  try {
    const { rows } = await db.query(
      'SELECT id, nome, email, perfil, escrevente_id, senha_hash, precisa_trocar_senha FROM usuarios WHERE id = $1',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ erro: 'Usuário não encontrado' });
    const user = rows[0];
    const ok = await bcrypt.compare(senha_atual, user.senha_hash);
    if (!ok) return res.status(401).json({ erro: 'Senha atual incorreta' });
    const hash = await bcrypt.hash(nova_senha, 12);
    const { rows: updatedRows } = await db.query(
      `UPDATE usuarios
          SET senha_hash = $1,
              precisa_trocar_senha = false
        WHERE id = $2
        RETURNING id, nome, email, perfil, escrevente_id, precisa_trocar_senha`,
      [hash, req.user.id]
    );
    const updatedUser = updatedRows[0];
    res.json({
      ok: true,
      token: buildAuthToken(updatedUser),
      user: buildAuthUser(updatedUser),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

module.exports = router;
