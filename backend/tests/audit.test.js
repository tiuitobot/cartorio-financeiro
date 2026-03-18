const test = require('node:test');
const assert = require('node:assert/strict');
const {
  formatDatePtBr,
  resolveHistoricDate,
  resolveVerificationStamp,
} = require('../lib/audit');

test('formatDatePtBr retorna data no formato pt-BR', () => {
  assert.equal(formatDatePtBr(new Date('2026-03-18T12:00:00.000Z')), '18/03/2026');
});

test('resolveVerificationStamp preserva data anterior quando o responsável não muda', () => {
  const previousAto = {
    verificado_por: 'Financeiro',
    verificado_em: '17/03/2026',
  };

  assert.equal(resolveVerificationStamp('Financeiro', previousAto), '17/03/2026');
});

test('resolveVerificationStamp limpa data quando verificação é removida', () => {
  assert.equal(resolveVerificationStamp(null, {
    verificado_por: 'Financeiro',
    verificado_em: '17/03/2026',
  }), null);
});

test('resolveHistoricDate preserva data anterior de correção conhecida', () => {
  const previousRowsById = new Map([
    ['42', { id: 42, data: '10/03/2026' }],
  ]);

  assert.equal(resolveHistoricDate({ id: 42 }, previousRowsById), '10/03/2026');
});
