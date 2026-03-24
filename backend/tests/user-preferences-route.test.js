const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const db = require('../db');
const { app } = require('../server');

async function startServer() {
  const server = http.createServer(app);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`,
  };
}

function buildToken(overrides = {}) {
  return jwt.sign(
    {
      id: 7,
      nome: 'QA Admin',
      email: 'qa@example.com',
      perfil: 'admin',
      ...overrides,
    },
    process.env.JWT_SECRET
  );
}

test('GET /api/usuarios/preferencias retorna preferências sanitizadas do usuário autenticado', async () => {
  const originalQuery = db.query;
  db.query = async (sql, params) => {
    assert.match(sql, /SELECT preferencias FROM usuarios_preferencias/i);
    assert.deepEqual(params, [7]);
    return {
      rows: [
        {
          preferencias: {
            livros_notas_colunas: ['controle', 'status', 'invalida'],
          },
        },
      ],
    };
  };

  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/api/usuarios/preferencias`, {
      headers: {
        Authorization: `Bearer ${buildToken()}`,
      },
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      livros_notas_colunas: ['controle', 'status'],
    });
  } finally {
    db.query = originalQuery;
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

test('PUT /api/usuarios/preferencias faz merge do patch e persiste o resultado sanitizado', async () => {
  const originalQuery = db.query;
  const calls = [];

  db.query = async (sql, params) => {
    calls.push({ sql, params });

    if (/SELECT preferencias FROM usuarios_preferencias/i.test(sql)) {
      return {
        rows: [
          {
            preferencias: {
              livros_notas_colunas: ['controle', 'data'],
            },
          },
        ],
      };
    }

    if (/INSERT INTO usuarios_preferencias/i.test(sql)) {
      return {
        rows: [
          {
            preferencias: JSON.parse(params[1]),
          },
        ],
      };
    }

    throw new Error(`query inesperada: ${sql}`);
  };

  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/api/usuarios/preferencias`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buildToken()}`,
      },
      body: JSON.stringify({
        preferencias: {
          relatorios_atos_colunas: ['controle', 'saldo', 'desconhecida'],
        },
      }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      livros_notas_colunas: ['controle', 'data'],
      relatorios_atos_colunas: ['controle', 'saldo'],
    });

    const upsertCall = calls.find((call) => /INSERT INTO usuarios_preferencias/i.test(call.sql));
    assert.ok(upsertCall);
    assert.deepEqual(JSON.parse(upsertCall.params[1]), {
      livros_notas_colunas: ['controle', 'data'],
      relatorios_atos_colunas: ['controle', 'saldo'],
    });
  } finally {
    db.query = originalQuery;
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});
