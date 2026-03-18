const { Pool } = require('pg');
require('dotenv').config();

function toBool(value) {
  return ['1', 'true', 'yes', 'on', 'require'].includes(String(value || '').toLowerCase());
}

const sslEnabled = toBool(process.env.DB_SSL);
const connectionString = process.env.DATABASE_URL;

const baseConfig = connectionString
  ? { connectionString }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'cartorio',
      user: process.env.DB_USER || 'cartorio_user',
      password: process.env.DB_PASSWORD,
    };

const pool = new Pool({
  ...baseConfig,
  ...(sslEnabled ? { ssl: { rejectUnauthorized: false } } : {}),
  max: parseInt(process.env.DB_POOL_MAX || '20', 10),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '5000', 10),
});

pool.on('error', (err) => {
  console.error('Erro inesperado no pool PostgreSQL:', err);
});

module.exports = pool;
