const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildReembolsosScope,
  buildReivindicacoesScope,
} = require('../lib/list-scopes');

test('buildReembolsosScope restringe escrevente ao proprio escrevente_id', () => {
  assert.deepEqual(
    buildReembolsosScope({ perfil: 'escrevente', escrevente_id: 12 }),
    {
      where: 'WHERE p.escrevente_id = $1',
      params: [12],
    }
  );
});

test('buildReivindicacoesScope restringe escrevente a suas reivindicacoes e atos como captador', () => {
  assert.deepEqual(
    buildReivindicacoesScope({ perfil: 'escrevente', escrevente_id: 12 }),
    {
      where: 'WHERE (r.escrevente_id = $1 OR a.captador_id = $1)',
      params: [12],
    }
  );
});

test('list scopes retornam erro para escrevente sem vinculo', () => {
  assert.deepEqual(
    buildReembolsosScope({ perfil: 'escrevente', escrevente_id: null }),
    { error: 'Usuário não vinculado a escrevente' }
  );

  assert.deepEqual(
    buildReivindicacoesScope({ perfil: 'escrevente', escrevente_id: null }),
    { error: 'Usuário não vinculado a escrevente' }
  );
});

test('list scopes nao restringem perfis financeiros e admin', () => {
  assert.deepEqual(
    buildReembolsosScope({ perfil: 'financeiro' }),
    { where: '', params: [] }
  );

  assert.deepEqual(
    buildReivindicacoesScope({ perfil: 'admin' }),
    { where: '', params: [] }
  );
});
