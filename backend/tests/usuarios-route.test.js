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

test('POST /api/usuarios normaliza espaços no e-mail antes de salvar', async () => {
  const originalQuery = db.query;
  const calls = [];

  db.query = async (sql, params) => {
    calls.push({ sql, params });
    assert.match(sql, /INSERT INTO usuarios/i);
    return {
      rows: [
        {
          id: 91,
          nome: params[0],
          email: params[1],
          perfil: params[3],
          escrevente_id: params[4],
          precisa_trocar_senha: true,
          ativo: true,
        },
      ],
    };
  };

  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/api/usuarios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buildToken()}`,
      },
      body: JSON.stringify({
        nome: 'Auxiliar QA',
        email: '  AUXILIAR.QA@EXAMPLE.COM  ',
        senha: 'Aux12345',
        perfil: 'auxiliar_registro',
      }),
    });

    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), {
      id: 91,
      nome: 'Auxiliar QA',
      email: 'auxiliar.qa@example.com',
      perfil: 'auxiliar_registro',
      escrevente_id: null,
      precisa_trocar_senha: true,
      ativo: true,
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].params[1], 'auxiliar.qa@example.com');
  } finally {
    db.query = originalQuery;
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

test('PUT /api/usuarios/:id normaliza espaços no e-mail antes de atualizar', async () => {
  const originalQuery = db.query;
  const calls = [];

  db.query = async (sql, params) => {
    calls.push({ sql, params });

    if (/UPDATE usuarios\s+SET senha_hash=/i.test(sql)) {
      return { rows: [] };
    }

    assert.match(sql, /UPDATE usuarios/i);
    return {
      rows: [
        {
          id: params[5],
          nome: params[0],
          email: params[1],
          perfil: params[2],
          escrevente_id: params[3],
          precisa_trocar_senha: false,
          ativo: params[4],
        },
      ],
    };
  };

  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/api/usuarios/91`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buildToken()}`,
      },
      body: JSON.stringify({
        nome: 'Auxiliar QA',
        email: '  AUXILIAR.QA+EDITADO@EXAMPLE.COM ',
        perfil: 'auxiliar_registro',
        escrevente_id: null,
        ativo: true,
      }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      id: 91,
      nome: 'Auxiliar QA',
      email: 'auxiliar.qa+editado@example.com',
      perfil: 'auxiliar_registro',
      escrevente_id: null,
      precisa_trocar_senha: false,
      ativo: true,
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].params[1], 'auxiliar.qa+editado@example.com');
  } finally {
    db.query = originalQuery;
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});
