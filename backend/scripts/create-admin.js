#!/usr/bin/env node
const bcrypt = require('bcrypt');
const db = require('../db');

const allowedPerfis = new Set(['admin', 'chefe_financeiro', 'financeiro']);

function required(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) {
    throw new Error(`${name} é obrigatório.`);
  }
  return value;
}

async function main() {
  const nome = required('ADMIN_NAME');
  const email = required('ADMIN_EMAIL').toLowerCase();
  const senha = required('ADMIN_PASSWORD');
  const perfil = String(process.env.ADMIN_PERFIL || 'admin').trim();
  const escreventeId = process.env.ADMIN_ESCREVENTE_ID
    ? Number.parseInt(process.env.ADMIN_ESCREVENTE_ID, 10)
    : null;

  if (!allowedPerfis.has(perfil)) {
    throw new Error('ADMIN_PERFIL deve ser admin, chefe_financeiro ou financeiro.');
  }

  if (senha.length < 12) {
    throw new Error('ADMIN_PASSWORD deve ter no mínimo 12 caracteres.');
  }

  const senhaHash = await bcrypt.hash(senha, 12);
  const { rows } = await db.query(
    `INSERT INTO usuarios(nome,email,senha_hash,perfil,escrevente_id,ativo)
     VALUES($1,$2,$3,$4,$5,true)
     ON CONFLICT(email) DO UPDATE SET
       nome = EXCLUDED.nome,
       senha_hash = EXCLUDED.senha_hash,
       perfil = EXCLUDED.perfil,
       escrevente_id = EXCLUDED.escrevente_id,
       ativo = true
     RETURNING id,nome,email,perfil,ativo`,
    [nome, email, senhaHash, perfil, Number.isInteger(escreventeId) ? escreventeId : null]
  );

  console.log('✓ usuário administrativo pronto:', rows[0]);
}

main()
  .catch((error) => {
    console.error('✗ falha ao criar usuário administrativo:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.end().catch(() => {});
  });
