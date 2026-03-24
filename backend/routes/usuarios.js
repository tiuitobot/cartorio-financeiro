// routes/usuarios.js
const router = require('express').Router();
const bcrypt = require('bcrypt');
const db = require('../db');
const { authMiddleware, requirePerfil } = require('../middleware/auth');

router.get('/', authMiddleware, requirePerfil('admin'), async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id,nome,email,perfil,escrevente_id,ativo,created_at FROM usuarios ORDER BY nome'
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
    const hash = await bcrypt.hash(senha, 12);
    const { rows } = await db.query(
      'INSERT INTO usuarios(nome,email,senha_hash,perfil,escrevente_id) VALUES($1,$2,$3,$4,$5) RETURNING id,nome,email,perfil,escrevente_id,ativo',
      [nome, email.toLowerCase(), hash, perfil, escrevente_id||null]
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
    if (nova_senha && nova_senha.length >= 6) {
      const hash = await bcrypt.hash(nova_senha, 12);
      await db.query('UPDATE usuarios SET senha_hash=$1 WHERE id=$2', [hash, id]);
    }
    const { rows } = await db.query(
      'UPDATE usuarios SET nome=$1,email=$2,perfil=$3,escrevente_id=$4,ativo=$5 WHERE id=$6 RETURNING id,nome,email,perfil,escrevente_id,ativo',
      [nome, email.toLowerCase(), perfil, escrevente_id||null, ativo!==false, id]
    );
    res.json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ erro: 'E-mail já cadastrado' });
    console.error(e); res.status(500).json({ erro: 'Erro interno' });
  }
});

module.exports = router;
