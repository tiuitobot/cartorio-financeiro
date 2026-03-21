const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calcStatus,
  totalAto,
  reembolsoDevidoEscrevente,
  calcularComissoes,
  enrichAtoFinance,
} = require('../lib/finance');

test('calcStatus retorna pendente quando não há pagamento', () => {
  assert.equal(calcStatus(100, 10, 5, 0, 0, 0), 'pendente');
});

test('calcStatus diferencia pagamento menor e maior', () => {
  assert.equal(calcStatus(100, 0, 0, 0, 0, 90), 'pago_menor');
  assert.equal(calcStatus(100, 0, 0, 0, 0, 110), 'pago_maior');
});

test('totalAto soma todos os componentes financeiros', () => {
  assert.equal(totalAto({
    emolumentos: 100,
    repasses: 20,
    issqn: 5,
    reembolso_tabeliao: 10,
    reembolso_escrevente: 15,
  }), 150);
});

test('reembolsoDevidoEscrevente respeita prioridade de recebimento', () => {
  assert.equal(reembolsoDevidoEscrevente({
    emolumentos: 100,
    repasses: 10,
    issqn: 5,
    reembolso_tabeliao: 5,
    reembolso_escrevente: 30,
    valor_pago: 120,
  }), 0);

  assert.equal(reembolsoDevidoEscrevente({
    emolumentos: 100,
    repasses: 10,
    issqn: 5,
    reembolso_tabeliao: 5,
    reembolso_escrevente: 30,
    valor_pago: 140,
  }), 20);
});

test('calcularComissoes retorna vazio quando não há captador', () => {
  assert.deepEqual(calcularComissoes({
    captador_id: null,
    emolumentos: 100,
  }), []);
});

test('calcularComissoes respeita regra de captador 20% com executor e signatário', () => {
  const resultado = calcularComissoes({
    captador_id: 1,
    captador_nome: 'Ana',
    captador_taxa: 20,
    executor_id: 2,
    executor_nome: 'Beto',
    executor_taxa: 6,
    signatario_id: 3,
    signatario_nome: 'Caio',
    signatario_taxa: 0,
    emolumentos: 1000,
    comissao_override: null,
  });

  assert.equal(resultado.length, 3);
  assert.equal(resultado[0].papel, 'Captador');
  assert.equal(resultado[0].total, 180);
  assert.equal(resultado[1].papel, 'Executor');
  assert.equal(resultado[1].total, 60);
  assert.equal(resultado[2].papel, 'Signatário');
  assert.equal(resultado[2].total, 20);
});

test('enrichAtoFinance adiciona total, comissões e reembolso devido', () => {
  const ato = enrichAtoFinance({
    captador_id: 1,
    captador_nome: 'Ana',
    captador_taxa: 20,
    executor_id: 2,
    executor_nome: 'Beto',
    executor_taxa: 6,
    signatario_id: 3,
    signatario_nome: 'Caio',
    signatario_taxa: 0,
    emolumentos: 1000,
    repasses: 100,
    issqn: 50,
    reembolso_tabeliao: 30,
    reembolso_escrevente: 40,
    valor_pago: 1240,
  });

  assert.equal(ato.total, 1220);
  assert.equal(ato.comissoes.length, 3);
  assert.equal(ato.reembolso_devido_escrevente, 40);
});

test('enrichAtoFinance normaliza override de comissão em shape estável', () => {
  const ato = enrichAtoFinance({
    emolumentos: 100,
    repasses: 0,
    issqn: 0,
    reembolso_tabeliao: 0,
    reembolso_escrevente: 0,
    valor_pago: 100,
    comissao_override: [
      {
        escrevente: { id: 7, nome: 'Ana' },
        papel: 'Captador',
        pct: 20,
        fixo: 0,
        total: 20,
      },
    ],
  });

  assert.deepEqual(ato.comissoes, [
    {
      escrevente_id: 7,
      nome: 'Ana',
      papel: 'Captador',
      pct: 20,
      fixo: 0,
      total: 20,
    },
  ]);
});

test('enrichAtoFinance separa status calculado do status confirmado', () => {
  const ato = enrichAtoFinance({
    emolumentos: 1000,
    repasses: 0,
    issqn: 0,
    reembolso_tabeliao: 0,
    reembolso_escrevente: 0,
    pagamentos: [
      { valor: 600, data_pagamento: '2026-03-20', forma_pagamento: 'Pix', confirmado_financeiro: true },
      { valor: 400, data_pagamento: '2026-03-21', forma_pagamento: 'Boleto', confirmado_financeiro: false },
    ],
  });

  assert.equal(ato.valor_pago_lancado, 1000);
  assert.equal(ato.valor_pago_confirmado, 600);
  assert.equal(ato.status_calculado, 'pago');
  assert.equal(ato.status, 'pago_menor');
  assert.equal(ato.tem_pagamento_pendente_confirmacao, true);
});
