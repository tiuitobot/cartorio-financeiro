#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const db = require('../db');

const migrationsDir = path.join(__dirname, '..', 'db', 'migrations');

async function ensureMigrationsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations() {
  const { rows } = await db.query('SELECT name FROM schema_migrations ORDER BY name');
  return new Set(rows.map((row) => row.name));
}

async function applyMigration(fileName) {
  const sql = fs.readFileSync(path.join(migrationsDir, fileName), 'utf8');
  const client = await db.connect();

  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query(
      'INSERT INTO schema_migrations(name) VALUES($1) ON CONFLICT(name) DO NOTHING',
      [fileName]
    );
    await client.query('COMMIT');
    console.log(`✓ migration aplicada: ${fileName}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();
  const files = fs.readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    await applyMigration(file);
  }

  console.log('✓ migrations concluídas');
}

main()
  .catch((error) => {
    console.error('✗ falha ao aplicar migrations:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.end().catch(() => {});
  });
