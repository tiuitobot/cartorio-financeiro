const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildDespesaRegistroImpact,
  normalizeDespesaRegistroPayload,
  validateDespesaRegistroPayload,
} = require('../lib/despesas-registro');

test('normalizeDespesaRegistroPayload normaliza controle, data e campos opcionais', () => {
  assert.deepEqual(
    normalizeDespesaRegistroPayload({
      controle_ref: '44',
      data_registro: '2026-03-24T13:00:00.000Z',
      valor: '123.45',
      descricao: ' Prenotação de imóvel ',
      cartorio_nome: ' 2º Registro de Imóveis ',
      protocolo: ' ABC-123 ',
      observacoes: '   ',
    }),
    {
      controle_ref: '00044',
      data_registro: '2026-03-24',
      valor: 123.45,
      descricao: 'Prenotação de imóvel',
      cartorio_nome: '2º Registro de Imóveis',
      protocolo: 'ABC-123',
      observacoes: null,
    }
  );
});

test('validateDespesaRegistroPayload exige campos obrigatórios da despesa', () => {
  assert.equal(
    validateDespesaRegistroPayload({
      controle_ref: null,
      data_registro: '2026-03-24',
      valor: 50,
      descricao: 'Despesa',
    }),
    'Controle obrigatório'
  );

  assert.equal(
    validateDespesaRegistroPayload({
      controle_ref: '00044',
      data_registro: null,
      valor: 50,
      descricao: 'Despesa',
    }),
    'Data do registro obrigatória'
  );

  assert.equal(
    validateDespesaRegistroPayload({
      controle_ref: '00044',
      data_registro: '2026-03-24',
      valor: 0,
      descricao: 'Despesa',
    }),
    'Valor deve ser maior que zero'
  );

  assert.equal(
    validateDespesaRegistroPayload({
      controle_ref: '00044',
      data_registro: '2026-03-24',
      valor: 50,
      descricao: '',
    }),
    'Descrição obrigatória'
  );
});

test('buildDespesaRegistroImpact marca despesa pós-pagamento sem reabrir o ato quitado', () => {
  assert.deepEqual(
    buildDespesaRegistroImpact(
      { data_registro: '2026-03-13' },
      { id: 1, livro: '42', pagina: '15', status: 'pago', data_pagamento: '2026-03-12' }
    ),
    {
      ato_vinculado_id: 1,
      ato_vinculado_livro: '42',
      ato_vinculado_pagina: '15',
      ato_vinculado_status: 'pago',
      ato_vinculado_data_pagamento: '2026-03-12',
      despesa_apos_pagamento: true,
      preserva_status_ato: true,
      impacto_financeiro: 'apos_pagamento_sem_recalculo',
    }
  );
});

test('buildDespesaRegistroImpact classifica ato sem pagamento sem sugerir recálculo', () => {
  assert.deepEqual(
    buildDespesaRegistroImpact(
      { data_registro: '2026-03-13' },
      { id: 2, livro: '43', pagina: '16', status: 'pendente', data_pagamento: null }
    ),
    {
      ato_vinculado_id: 2,
      ato_vinculado_livro: '43',
      ato_vinculado_pagina: '16',
      ato_vinculado_status: 'pendente',
      ato_vinculado_data_pagamento: null,
      despesa_apos_pagamento: false,
      preserva_status_ato: false,
      impacto_financeiro: 'ato_sem_pagamento',
    }
  );
});
