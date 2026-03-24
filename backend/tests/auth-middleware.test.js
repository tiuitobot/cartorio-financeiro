const test = require('node:test');
const assert = require('node:assert/strict');
const { shouldBypassForcedPasswordChange } = require('../middleware/auth');

test('bypass de troca obrigatória permite somente /api/auth/me e /api/auth/senha', () => {
  assert.equal(
    shouldBypassForcedPasswordChange({ baseUrl: '/api/auth', path: '/me' }),
    true
  );
  assert.equal(
    shouldBypassForcedPasswordChange({ baseUrl: '/api/auth', path: '/senha' }),
    true
  );
});

test('bypass de troca obrigatória bloqueia outras rotas autenticadas', () => {
  assert.equal(
    shouldBypassForcedPasswordChange({ baseUrl: '/api/atos', path: '/' }),
    false
  );
  assert.equal(
    shouldBypassForcedPasswordChange({ baseUrl: '/api/auth', path: '/login' }),
    false
  );
});
