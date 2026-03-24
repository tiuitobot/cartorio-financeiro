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

test('POST /api/despesas-registro cria despesa com payload normalizado', async () => {
  const originalQuery = db.query;
  const calls = [];

  db.query = async (sql, params) => {
    calls.push({ sql, params });

    if (/INSERT INTO despesas_registro/i.test(sql)) {
      return {
        rows: [{ id: 101 }],
      };
    }

    if (/FROM despesas_registro d/i.test(sql) && /WHERE d\.id = \$1/i.test(sql)) {
      return {
        rows: [
          {
            id: 101,
            controle_ref: '00044',
            data_registro: '2026-03-24',
            valor: 145.9,
            descricao: 'Despesa de prenotação',
            cartorio_nome: 'Registro de Imóveis',
            protocolo: 'P-44',
            observacoes: null,
            criado_por_user_id: 7,
            criado_por_nome: 'QA Admin',
            ato_vinculado_id: 3,
            ato_vinculado_livro: '42',
            ato_vinculado_pagina: '17',
            ato_vinculado_status: 'pago_menor',
            ato_vinculado_data_pagamento: '2026-03-09',
          },
        ],
      };
    }

    throw new Error(`query inesperada: ${sql}`);
  };

  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/api/despesas-registro`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buildToken()}`,
      },
      body: JSON.stringify({
        controle_ref: '44',
        data_registro: '2026-03-24',
        valor: '145.9',
        descricao: ' Despesa de prenotação ',
        cartorio_nome: ' Registro de Imóveis ',
        protocolo: ' P-44 ',
      }),
    });

    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), {
      id: 101,
      controle_ref: '00044',
      data_registro: '2026-03-24',
      valor: 145.9,
      descricao: 'Despesa de prenotação',
      cartorio_nome: 'Registro de Imóveis',
      protocolo: 'P-44',
      observacoes: null,
      criado_por_user_id: 7,
      criado_por_nome: 'QA Admin',
      ato_vinculado_id: 3,
      ato_vinculado_livro: '42',
      ato_vinculado_pagina: '17',
      ato_vinculado_status: 'pago_menor',
      ato_vinculado_data_pagamento: '2026-03-09',
      despesa_apos_pagamento: true,
      preserva_status_ato: true,
      impacto_financeiro: 'apos_pagamento_sem_recalculo',
    });

    const insertCall = calls.find((call) => /INSERT INTO despesas_registro/i.test(call.sql));
    assert.ok(insertCall);
    assert.deepEqual(insertCall.params, [
      '00044',
      '2026-03-24',
      145.9,
      'Despesa de prenotação',
      'Registro de Imóveis',
      'P-44',
      null,
      7,
    ]);
    assert.equal(calls.some((call) => /UPDATE atos/i.test(call.sql)), false);
  } finally {
    db.query = originalQuery;
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

test('PUT /api/despesas-registro/:id atualiza despesa existente', async () => {
  const originalQuery = db.query;

  db.query = async (sql, params) => {
    if (/UPDATE despesas_registro/i.test(sql)) {
      return {
        rows: [{ id: params[7] }],
      };
    }

    if (/FROM despesas_registro d/i.test(sql) && /WHERE d\.id = \$1/i.test(sql)) {
      return {
        rows: [
          {
            id: 101,
            controle_ref: '00045',
            data_registro: '2026-03-25',
            valor: 250,
            descricao: 'Registro complementar',
            cartorio_nome: '2º RI',
            protocolo: 'P-45',
            observacoes: 'Ajuste de documentação',
            criado_por_user_id: 7,
            criado_por_nome: 'QA Admin',
            ato_vinculado_id: 4,
            ato_vinculado_livro: '42',
            ato_vinculado_pagina: '18',
            ato_vinculado_status: 'pago',
            ato_vinculado_data_pagamento: '2026-03-06',
          },
        ],
      };
    }

    throw new Error(`query inesperada: ${sql}`);
  };

  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/api/despesas-registro/101`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buildToken()}`,
      },
      body: JSON.stringify({
        controle_ref: '45',
        data_registro: '2026-03-25',
        valor: 250,
        descricao: 'Registro complementar',
        cartorio_nome: '2º RI',
        protocolo: 'P-45',
        observacoes: 'Ajuste de documentação',
      }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      id: 101,
      controle_ref: '00045',
      data_registro: '2026-03-25',
      valor: 250,
      descricao: 'Registro complementar',
      cartorio_nome: '2º RI',
      protocolo: 'P-45',
      observacoes: 'Ajuste de documentação',
      criado_por_user_id: 7,
      criado_por_nome: 'QA Admin',
      ato_vinculado_id: 4,
      ato_vinculado_livro: '42',
      ato_vinculado_pagina: '18',
      ato_vinculado_status: 'pago',
      ato_vinculado_data_pagamento: '2026-03-06',
      despesa_apos_pagamento: true,
      preserva_status_ato: true,
      impacto_financeiro: 'apos_pagamento_sem_recalculo',
    });
  } finally {
    db.query = originalQuery;
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});
