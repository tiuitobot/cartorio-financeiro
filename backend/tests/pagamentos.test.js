const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildPagamentoState,
  resolvePagamentoConfirmations,
} = require('../lib/pagamentos');

test('buildPagamentoState separa lançado de confirmado', () => {
  const state = buildPagamentoState([
    { valor: 600, data_pagamento: '2026-03-20', forma_pagamento: 'Pix', confirmado_financeiro: true },
    { valor: 400, data_pagamento: '2026-03-21', forma_pagamento: 'Boleto', confirmado_financeiro: false },
  ]);

  assert.equal(state.lancado.valor_pago, 1000);
  assert.equal(state.confirmado.valor_pago, 600);
  assert.equal(state.totalCount, 2);
  assert.equal(state.confirmedCount, 1);
  assert.equal(state.pendingCount, 1);
  assert.equal(state.allConfirmed, false);
});

test('buildPagamentoState ignora pagamentos com valor zero', () => {
  const state = buildPagamentoState([
    { valor: 0, forma_pagamento: 'Pix', confirmado_financeiro: false },
  ]);

  assert.equal(state.lancado.valor_pago, 0);
  assert.equal(state.confirmado.valor_pago, 0);
  assert.equal(state.totalCount, 0);
  assert.equal(state.confirmedCount, 0);
  assert.equal(state.pendingCount, 0);
  assert.equal(state.allConfirmed, false);
});

test('resolvePagamentoConfirmations preserva carimbo de confirmação existente', () => {
  const pagamentos = resolvePagamentoConfirmations(
    [{ id: 12, valor: 500, confirmado_financeiro: true }],
    [{ id: 12, valor: 500, confirmado_financeiro: true, confirmado_financeiro_por: 'Financeiro', confirmado_financeiro_em: '2026-03-20T12:00:00.000Z' }],
    { nome: 'Admin' }
  );

  assert.equal(pagamentos[0].confirmado_financeiro, true);
  assert.equal(pagamentos[0].confirmado_financeiro_por, 'Financeiro');
  assert.equal(pagamentos[0].confirmado_financeiro_em, '2026-03-20T12:00:00.000Z');
});

test('resolvePagamentoConfirmations carimba nova confirmação com o ator atual', () => {
  const pagamentos = resolvePagamentoConfirmations(
    [{ valor: 250, confirmado_financeiro: true }],
    [],
    { nome: 'Chefe Financeiro' }
  );

  assert.equal(pagamentos[0].confirmado_financeiro, true);
  assert.equal(pagamentos[0].confirmado_financeiro_por, 'Chefe Financeiro');
  assert.ok(pagamentos[0].confirmado_financeiro_em);
});
