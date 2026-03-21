const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizePagamentosPayload,
  summarizePagamentos,
  serializePagamentoList,
} = require('../lib/pagamentos');
const { buildAtoDiffMessage } = require('../lib/ato-diff');

test('normalizePagamentosPayload usa legado quando pagamentos[] não vier', () => {
  const pagamentos = normalizePagamentosPayload(null, {
    valor_pago: 150.5,
    data_pagamento: '2026-03-20',
    forma_pagamento: 'PIX',
  });

  assert.deepEqual(pagamentos, [
    {
      id: null,
      valor: 150.5,
      data_pagamento: '2026-03-20',
      forma_pagamento: 'Pix',
      notas: null,
    },
  ]);
});

test('summarizePagamentos consolida valor, última data e forma múltipla', () => {
  const summary = summarizePagamentos([
    { valor: 100, data_pagamento: '2026-03-10', forma_pagamento: 'Pix' },
    { valor: 50, data_pagamento: '2026-03-15', forma_pagamento: 'TED' },
  ]);

  assert.deepEqual(summary, {
    valor_pago: 150,
    data_pagamento: '2026-03-15',
    forma_pagamento: 'Múltiplo',
  });
});

test('serializePagamentoList ignora ordem de entrada e estabiliza comparação', () => {
  const first = serializePagamentoList([
    { valor: 50, data_pagamento: '2026-03-15', forma_pagamento: 'TED' },
    { valor: 100, data_pagamento: '2026-03-10', forma_pagamento: 'Pix' },
  ]);
  const second = serializePagamentoList([
    { valor: 100, data_pagamento: '2026-03-10', forma_pagamento: 'Pix' },
    { valor: 50, data_pagamento: '2026-03-15', forma_pagamento: 'TED' },
  ]);

  assert.equal(first, second);
});

test('buildAtoDiffMessage descreve mudança de campo e de pagamentos', () => {
  const result = buildAtoDiffMessage({
    previousAto: {
      captador_id: 1,
      emolumentos: 100,
      notas: null,
    },
    nextAto: {
      captador_id: 2,
      emolumentos: 150,
      notas: 'Ajuste manual',
    },
    previousPagamentos: [
      { valor: 100, data_pagamento: '2026-03-10', forma_pagamento: 'Pix' },
    ],
    nextPagamentos: [
      { valor: 60, data_pagamento: '2026-03-10', forma_pagamento: 'Pix' },
      { valor: 90, data_pagamento: '2026-03-12', forma_pagamento: 'TED' },
    ],
    escreventesById: { 1: 'Ana', 2: 'Bruno' },
    actorName: 'Financeiro',
  });

  assert.equal(result.autor, 'Financeiro');
  assert.match(result.mensagem, /Captador: Ana -> Bruno/);
  assert.match(result.mensagem, /Emolumentos:/);
  assert.match(result.mensagem, /Pagamentos:/);
});
