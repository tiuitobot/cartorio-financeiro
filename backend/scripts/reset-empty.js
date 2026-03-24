#!/usr/bin/env node
const bcrypt = require('bcrypt');
const db = require('../db');

function required(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) {
    throw new Error(`${name} é obrigatório.`);
  }
  return value;
}

async function main() {
  if (process.env.ALLOW_RESET_EMPTY !== '1') {
    throw new Error('Defina ALLOW_RESET_EMPTY=1 para executar o reset vazio.');
  }

  const adminName = required('ADMIN_NAME');
  const adminEmail = required('ADMIN_EMAIL').toLowerCase();
  const adminPassword = required('ADMIN_PASSWORD');

  if (adminPassword.length < 12) {
    throw new Error('ADMIN_PASSWORD deve ter no mínimo 12 caracteres.');
  }

  const client = await db.connect();

  try {
    await client.query('BEGIN');
    await client.query(`
      TRUNCATE TABLE
        pendencias,
        import_linhas,
        import_lotes,
        correcoes,
        pagamentos_reembolso,
        reivindicacoes,
        atos,
        usuarios,
        escreventes_taxas_historico,
        escreventes_compartilhamento,
        escreventes
      RESTART IDENTITY CASCADE
    `);

    const senhaHash = await bcrypt.hash(adminPassword, 12);
    const { rows } = await client.query(
      `INSERT INTO usuarios(nome,email,senha_hash,perfil,escrevente_id,precisa_trocar_senha,ativo)
       VALUES($1,$2,$3,'admin',NULL,true,true)
       RETURNING id,nome,email,perfil,precisa_trocar_senha,ativo`,
      [adminName, adminEmail, senhaHash]
    );

    await client.query('COMMIT');
    console.log('✓ ambiente resetado para vazio');
    console.log('  admin:', rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

main()
  .catch((error) => {
    console.error('✗ falha ao resetar ambiente:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.end().catch(() => {});
  });
