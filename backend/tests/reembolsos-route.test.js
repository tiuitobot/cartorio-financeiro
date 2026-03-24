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
      nome: 'QA User',
      email: 'qa@example.com',
      perfil: 'admin',
      ...overrides,
    },
    process.env.JWT_SECRET
  );
}

function createMockClient(handler) {
  return {
    released: false,
    async query(sql, params) {
      return handler(sql, params);
    },
    release() {
      this.released = true;
    },
  };
}

test('PUT /api/reembolsos/:id/contestar cria pendência operacional para a contestação', async () => {
  const originalConnect = db.connect;
  const calls = [];
  const client = createMockClient(async (sql, params) => {
    calls.push({ sql, params });

    if (/BEGIN/i.test(sql) || /COMMIT/i.test(sql) || /ROLLBACK/i.test(sql)) {
      return { rows: [] };
    }

    if (/SELECT \* FROM pagamentos_reembolso WHERE id=\$1 FOR UPDATE/i.test(sql)) {
      assert.deepEqual(params, [55]);
      return {
        rows: [
          {
            id: 55,
            escrevente_id: 2,
            valor: 1234,
          },
        ],
      };
    }

    if (/UPDATE pagamentos_reembolso/i.test(sql)) {
      assert.deepEqual(params, [55, 'Pagamento não confere']);
      return {
        rows: [
          {
            id: 55,
            escrevente_id: 2,
            contestado_escrevente: true,
            contestacao_justificativa: 'Pagamento não confere',
          },
        ],
      };
    }

    if (/SELECT id\s+FROM pendencias/i.test(sql)) {
      assert.deepEqual(params, ['reembolso:55:contestacao']);
      return { rows: [] };
    }

    if (/INSERT INTO pendencias/i.test(sql)) {
      assert.equal(params[9], 'reembolso:55:contestacao');
      assert.deepEqual(JSON.parse(params[10]), {
        reembolso_id: 55,
        contestacao_justificativa: 'Pagamento não confere',
      });
      return {
        rows: [
          {
            id: 901,
            chave_unica: params[9],
            metadata: params[10],
          },
        ],
      };
    }

    throw new Error(`query inesperada: ${sql}`);
  });

  db.connect = async () => client;

  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/api/reembolsos/55/contestar`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buildToken({ perfil: 'escrevente', escrevente_id: 2 })}`,
      },
      body: JSON.stringify({
        justificativa: 'Pagamento não confere',
      }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      id: 55,
      escrevente_id: 2,
      contestado_escrevente: true,
      contestacao_justificativa: 'Pagamento não confere',
    });
    assert.equal(client.released, true);
    assert.ok(calls.some((call) => /INSERT INTO pendencias/i.test(call.sql)));
  } finally {
    db.connect = originalConnect;
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

test('PUT /api/reembolsos/:id/confirmar resolve a pendência operacional existente', async () => {
  const originalConnect = db.connect;
  const calls = [];
  const client = createMockClient(async (sql, params) => {
    calls.push({ sql, params });

    if (/BEGIN/i.test(sql) || /COMMIT/i.test(sql) || /ROLLBACK/i.test(sql)) {
      return { rows: [] };
    }

    if (/SELECT \* FROM pagamentos_reembolso WHERE id=\$1 FOR UPDATE/i.test(sql)) {
      assert.deepEqual(params, [55]);
      return {
        rows: [
          {
            id: 55,
            escrevente_id: 2,
            contestado_escrevente: true,
          },
        ],
      };
    }

    if (/UPDATE pagamentos_reembolso/i.test(sql)) {
      assert.deepEqual(params, [55]);
      return {
        rows: [
          {
            id: 55,
            escrevente_id: 2,
            confirmado_escrevente: true,
            contestado_escrevente: false,
            contestacao_justificativa: null,
          },
        ],
      };
    }

    if (/UPDATE pendencias/i.test(sql)) {
      assert.deepEqual(params, [ 'reembolso:55:contestacao', 7, 'Contestação de reembolso encerrada' ]);
      return { rows: [] };
    }

    throw new Error(`query inesperada: ${sql}`);
  });

  db.connect = async () => client;

  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/api/reembolsos/55/confirmar`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buildToken({ id: 7, perfil: 'admin' })}`,
      },
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      id: 55,
      escrevente_id: 2,
      confirmado_escrevente: true,
      contestado_escrevente: false,
      contestacao_justificativa: null,
    });
    assert.equal(client.released, true);
    assert.ok(calls.some((call) => /UPDATE pendencias/i.test(call.sql)));
  } finally {
    db.connect = originalConnect;
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});
