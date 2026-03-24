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
      id: 70,
      nome: 'QA Auxiliar',
      email: 'qa-aux@example.com',
      perfil: 'auxiliar_registro',
      ...overrides,
    },
    process.env.JWT_SECRET
  );
}

test('GET /api/atos bloqueia auxiliar_registro', async () => {
  const originalQuery = db.query;
  db.query = async () => {
    throw new Error('não deveria consultar o banco');
  };

  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/api/atos`, {
      headers: {
        Authorization: `Bearer ${buildToken()}`,
      },
    });

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), {
      erro: 'Permissão insuficiente',
    });
  } finally {
    db.query = originalQuery;
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

test('GET /api/despesas-registro permite auxiliar_registro', async () => {
  const originalQuery = db.query;

  db.query = async (sql) => {
    assert.match(sql, /FROM despesas_registro/i);
    return {
      rows: [
        {
          id: 1,
          controle_ref: '00044',
          data_registro: '2026-03-24',
          valor: 120,
          descricao: 'Prenotação',
        },
      ],
    };
  };

  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/api/despesas-registro`, {
      headers: {
        Authorization: `Bearer ${buildToken()}`,
      },
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), [
      {
        id: 1,
        controle_ref: '00044',
        data_registro: '2026-03-24',
        valor: 120,
        descricao: 'Prenotação',
        ato_vinculado_id: null,
        ato_vinculado_livro: null,
        ato_vinculado_pagina: null,
        ato_vinculado_status: null,
        ato_vinculado_data_pagamento: null,
        despesa_apos_pagamento: false,
        preserva_status_ato: false,
        impacto_financeiro: 'sem_ato_vinculado',
      },
    ]);
  } finally {
    db.query = originalQuery;
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});
