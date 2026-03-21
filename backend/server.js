require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const db = require('./db');
const { validateRuntimeConfig } = require('./lib/runtime');

const app = express();
const HOST = process.env.HOST || '0.0.0.0';
const PORT = parseInt(process.env.PORT || '3001');

function buildCorsOrigin() {
  const raw = process.env.CORS_ORIGIN;
  if (!raw) return true;
  if (raw === '*') return true;

  const allowed = raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (!allowed.length) return true;

  return (origin, callback) => {
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origem não permitida pelo CORS'));
  };
}

// ── Middlewares ────────────────────────────────────────────────────────────────
app.set('trust proxy', 1);
app.use(cors({ origin: buildCorsOrigin(), credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Rate limiting para rotas de auth
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas. Aguarde 15 minutos.' },
}));

// ── Rotas da API ───────────────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/escreventes',   require('./routes/escreventes'));
app.use('/api/atos',          require('./routes/atos'));
app.use('/api/importacoes',   require('./routes/importacoes'));
app.use('/api/pendencias',    require('./routes/pendencias'));
app.use('/api/reembolsos',    require('./routes/reembolsos'));
app.use('/api/reivindicacoes',require('./routes/reivindicacoes'));
app.use('/api/usuarios',      require('./routes/usuarios'));

// ── Frontend (produção) ────────────────────────────────────────────────────────
const distPath = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      next();
      return;
    }

    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => res.json({ status: 'API em execução', versao: '1.0.0' }));
}

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', db: 'conectado', timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(503).json({ status: 'erro', db: 'desconectado' });
  }
});

// ── Inicialização ──────────────────────────────────────────────────────────────
async function init() {
  try {
    const configErrors = validateRuntimeConfig(process.env);
    if (configErrors.length) {
      throw new Error(configErrors.join(' '));
    }
    await db.query('SELECT 1');
    console.log('✅ Banco de dados conectado');
    if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGIN) {
      console.warn('⚠️ CORS_ORIGIN não definido; qualquer origem será aceita.');
    }
    app.listen(PORT, HOST, () => {
      console.log(`✅ Servidor rodando na porta ${PORT}`);
      console.log(`   Host: ${HOST}`);
      console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (e) {
    console.error('❌ Falha ao conectar ao banco de dados:', e.message);
    console.error('   Verifique as configurações no arquivo .env');
    process.exit(1);
  }
}

init();
