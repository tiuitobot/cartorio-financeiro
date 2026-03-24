const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeColumnSelection,
  sanitizeUserPreferences,
  mergeUserPreferences,
  LIVROS_NOTAS_COLUMN_KEYS,
} = require('../lib/user-preferences');

test('normalizeColumnSelection filtra chaves inválidas e remove duplicadas', () => {
  assert.deepEqual(
    normalizeColumnSelection(
      ['controle', 'controle', 'status', 'invalida', 10, ' status '],
      LIVROS_NOTAS_COLUMN_KEYS
    ),
    ['controle', 'status']
  );
});

test('sanitizeUserPreferences mantém apenas preferências conhecidas com arrays válidos', () => {
  assert.deepEqual(
    sanitizeUserPreferences({
      livros_notas_colunas: ['controle', 'status', 'xpto'],
      relatorios_atos_colunas: 'invalido',
      qualquer_outra: ['controle'],
    }),
    {
      livros_notas_colunas: ['controle', 'status'],
    }
  );
});

test('mergeUserPreferences preserva preferências antigas e aplica patch sanitizado', () => {
  assert.deepEqual(
    mergeUserPreferences(
      {
        livros_notas_colunas: ['controle', 'data'],
      },
      {
        relatorios_atos_colunas: ['controle', 'saldo', 'nao_existe'],
      }
    ),
    {
      livros_notas_colunas: ['controle', 'data'],
      relatorios_atos_colunas: ['controle', 'saldo'],
    }
  );
});
