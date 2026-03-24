const test = require('node:test');
const assert = require('node:assert/strict');
const {
  canEditAto,
  canEditReembolsoTabeliao,
  validateReembolsoTabeliaoWrite,
} = require('../lib/ato-permissions');

test('apenas trilha financeira edita atos', () => {
  assert.equal(canEditAto({ perfil: 'admin' }), true);
  assert.equal(canEditAto({ perfil: 'financeiro' }), true);
  assert.equal(canEditAto({ perfil: 'chefe_financeiro' }), true);
  assert.equal(canEditAto({ perfil: 'escrevente' }), false);
  assert.equal(canEditAto({ perfil: 'auxiliar_registro' }), false);
});

test('apenas trilha financeira edita reembolso do tabelião', () => {
  assert.equal(canEditReembolsoTabeliao({ perfil: 'admin' }), true);
  assert.equal(canEditReembolsoTabeliao({ perfil: 'financeiro' }), true);
  assert.equal(canEditReembolsoTabeliao({ perfil: 'chefe_financeiro' }), true);
  assert.equal(canEditReembolsoTabeliao({ perfil: 'escrevente' }), false);
  assert.equal(canEditReembolsoTabeliao({ perfil: 'auxiliar_registro' }), false);
});

test('bloqueia mudança de reembolso do tabelião fora da trilha financeira', () => {
  assert.equal(
    validateReembolsoTabeliaoWrite({
      actor: { perfil: 'escrevente' },
      previousAto: { reembolso_tabeliao: 0 },
      nextAto: { reembolso_tabeliao: 50 },
    }),
    'Permissão insuficiente para alterar reembolso do tabelião'
  );
});

test('permite manter o mesmo valor de reembolso do tabelião sem erro', () => {
  assert.equal(
    validateReembolsoTabeliaoWrite({
      actor: { perfil: 'escrevente' },
      previousAto: { reembolso_tabeliao: 0 },
      nextAto: { reembolso_tabeliao: 0 },
    }),
    null
  );
});
