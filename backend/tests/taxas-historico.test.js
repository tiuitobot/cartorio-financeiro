const test = require('node:test');
const assert = require('node:assert/strict');

const {
  HISTORICO_TAXA_BASE_DATE,
  ensureTaxaHistoricoBaseline,
  fetchEffectiveTaxaAtDate,
} = require('../lib/taxas-historico');

test('ensureTaxaHistoricoBaseline cria baseline 1900 usando a taxa mais antiga registrada', async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql, params });

      if (sql.includes('vigencia_inicio = $2')) {
        return { rows: [] };
      }

      if (sql.includes('ORDER BY created_at ASC, id ASC')) {
        return {
          rows: [
            { taxa: 6 },
          ],
        };
      }

      if (sql.includes('INSERT INTO escreventes_taxas_historico')) {
        return { rows: [] };
      }

      throw new Error(`query inesperada: ${sql}`);
    },
  };

  const created = await ensureTaxaHistoricoBaseline(client, {
    escreventeId: 10,
    fallbackTaxa: 30,
    createdByUserId: 99,
  });

  assert.equal(created, true);
  const insertCall = calls.find((call) => call.sql.includes('INSERT INTO escreventes_taxas_historico'));
  assert.ok(insertCall);
  assert.deepEqual(insertCall.params, [10, 6, HISTORICO_TAXA_BASE_DATE, 99]);
});

test('ensureTaxaHistoricoBaseline nao cria linha quando baseline ja existe', async () => {
  const client = {
    async query(sql) {
      if (sql.includes('vigencia_inicio = $2')) {
        return { rows: [{ exists: 1 }] };
      }
      throw new Error(`query inesperada: ${sql}`);
    },
  };

  const created = await ensureTaxaHistoricoBaseline(client, {
    escreventeId: 10,
    fallbackTaxa: 20,
  });

  assert.equal(created, false);
});

test('fetchEffectiveTaxaAtDate usa fallback quando nao ha historico', async () => {
  const client = {
    async query() {
      return { rows: [] };
    },
  };

  const taxa = await fetchEffectiveTaxaAtDate(client, 10, '2026-03-15', 20);
  assert.equal(taxa, 20);
});
