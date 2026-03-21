const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildAutomaticPendenciasForAto,
  serializePendencia,
} = require('../lib/pendencias');

test('buildAutomaticPendenciasForAto gera pendência de pagamento quando não há lançamentos', () => {
  const pendencias = buildAutomaticPendenciasForAto({
    id: 1,
    controle: '00042',
    livro: '42',
    pagina: '15',
    data_ato: '2026-03-10',
    tipo_ato: 'PROCURAÇÃO',
    emolumentos: 850,
    pagamentos: [],
  });

  assert.equal(pendencias.some((item) => item.tipo === 'pendencia_pagamento'), true);
  assert.equal(pendencias.some((item) => item.tipo === 'confirmacao_pendente'), false);
});

test('buildAutomaticPendenciasForAto gera confirmação pendente para lançamentos não conferidos', () => {
  const pendencias = buildAutomaticPendenciasForAto({
    id: 2,
    controle: '00043',
    livro: '42',
    pagina: '16',
    data_ato: '2026-03-11',
    tipo_ato: 'COMPRA E VENDA',
    emolumentos: 1200,
    pagamentos: [
      { valor: 600, data_pagamento: '2026-03-12', forma_pagamento: 'Pix', confirmado_financeiro: false },
    ],
  });

  assert.equal(pendencias.some((item) => item.tipo === 'confirmacao_pendente'), true);
  assert.equal(pendencias.some((item) => item.tipo === 'pendencia_pagamento'), false);
});

test('buildAutomaticPendenciasForAto aponta informação incompleta quando pagamento não tem forma', () => {
  const pendencias = buildAutomaticPendenciasForAto({
    id: 3,
    controle: '00044',
    livro: '42',
    pagina: '17',
    data_ato: '2026-03-12',
    tipo_ato: 'ESCRITURA',
    emolumentos: 500,
    pagamentos: [
      { valor: 500, data_pagamento: '2026-03-14', forma_pagamento: null, confirmado_financeiro: false },
    ],
  });

  const pendencia = pendencias.find((item) => item.tipo === 'informacao_incompleta');
  assert.ok(pendencia);
  assert.match(pendencia.descricao, /pagamento lançado sem data ou forma/i);
});

test('serializePendencia restringe referência do ato para manifestação fora da alçada do escrevente', () => {
  const serialized = serializePendencia({
    id: 10,
    ato_id: 99,
    tipo: 'manifestacao_escrevente',
    descricao: 'Divergência',
    criado_em: '2026-03-20T10:00:00.000Z',
    solucionado: false,
    solucionado_em: null,
    resolucao: null,
    origem: 'escrevente',
    visivel: true,
    metadata: { relacionado_ao_ato: false },
    escrevente_id: 7,
    escrevente_nome: 'QA',
    controle_ref: '00999',
    ato_controle: '00999',
    ato_livro: '43',
    ato_pagina: '59',
    data_ato_ref: '2026-03-19',
    ato_data_ato: '2026-03-19',
    ato_captador_id: 1,
    ato_executor_id: 2,
    ato_signatario_id: 3,
  }, {
    perfil: 'escrevente',
    escrevente_id: 7,
  });

  assert.equal(serialized.acesso_ato_restrito, true);
  assert.equal(serialized.referencia, null);
  assert.equal(serialized.pode_abrir_ato, false);
  assert.equal(serialized.controle, '00999');
});
