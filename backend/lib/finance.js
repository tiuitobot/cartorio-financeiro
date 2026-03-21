const { buildPagamentoState } = require('./pagamentos');

function toNumber(value) {
  const parsed = Number.parseFloat(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function calcStatus(emolumentos, repasses, issqn, rembTab, rembEsc, valorPago) {
  const total = toNumber(emolumentos)
    + toNumber(repasses)
    + toNumber(issqn)
    + toNumber(rembTab)
    + toNumber(rembEsc);
  const pago = toNumber(valorPago);

  if (pago <= 0) return 'pendente';
  if (pago < total - 0.005) return 'pago_menor';
  if (pago > total + 0.005) return 'pago_maior';
  return 'pago';
}

function totalAto(ato) {
  return toNumber(ato.emolumentos)
    + toNumber(ato.repasses)
    + toNumber(ato.issqn)
    + toNumber(ato.reembolso_tabeliao)
    + toNumber(ato.reembolso_escrevente);
}

function reembolsoDevidoEscrevente(ato) {
  const reembolsoEscrevente = toNumber(ato.reembolso_escrevente);
  const valorPago = toNumber(ato.valor_pago);

  if (reembolsoEscrevente <= 0 || valorPago <= 0) return 0;

  const prioridade = toNumber(ato.emolumentos)
    + toNumber(ato.repasses)
    + toNumber(ato.issqn)
    + toNumber(ato.reembolso_tabeliao);
  const sobra = valorPago - prioridade;

  if (sobra <= 0) return 0;
  return Math.min(sobra, reembolsoEscrevente);
}

function calcularComissoes(ato) {
  if (Array.isArray(ato.comissao_override) && ato.comissao_override.length) {
    return ato.comissao_override.map((item) => ({
      escrevente_id: item.escrevente_id ?? item.escrevente?.id ?? null,
      nome: item.nome ?? item.escrevente?.nome ?? null,
      papel: item.papel ?? null,
      pct: item.pct ?? null,
      fixo: toNumber(item.fixo),
      total: toNumber(item.total),
    }));
  }

  if (!ato.captador_id) return [];

  const captador = {
    id: ato.captador_id,
    nome: ato.captador_nome,
    taxa: Number.parseInt(ato.captador_taxa || 0, 10),
  };
  const executor = ato.executor_id
    ? { id: ato.executor_id, nome: ato.executor_nome, taxa: Number.parseInt(ato.executor_taxa || 0, 10) }
    : null;
  const signatario = ato.signatario_id
    ? { id: ato.signatario_id, nome: ato.signatario_nome, taxa: Number.parseInt(ato.signatario_taxa || 0, 10) }
    : null;

  if (!captador.nome || !captador.taxa) return [];

  const base = toNumber(ato.emolumentos);
  const temExecutor = Boolean(executor);
  const temSignatario = Boolean(signatario);
  const valorSignatario = 20;
  const resultado = [];

  if (captador.taxa === 30) {
    const percentualCaptador = temExecutor ? 24 : 30;
    let valorCaptador = (base * percentualCaptador) / 100;
    if (temSignatario) valorCaptador -= valorSignatario;

    resultado.push({
      escrevente_id: captador.id,
      nome: captador.nome,
      papel: 'Captador',
      pct: percentualCaptador,
      fixo: temSignatario ? -valorSignatario : 0,
      total: Math.max(0, valorCaptador),
    });
    if (temExecutor) {
      resultado.push({
        escrevente_id: executor.id,
        nome: executor.nome,
        papel: 'Executor',
        pct: 6,
        fixo: 0,
        total: (base * 6) / 100,
      });
    }
    if (temSignatario) {
      resultado.push({
        escrevente_id: signatario.id,
        nome: signatario.nome,
        papel: 'Signatário',
        pct: null,
        fixo: valorSignatario,
        total: valorSignatario,
      });
    }
    return resultado;
  }

  if (captador.taxa === 20) {
    let valorCaptador = (base * 20) / 100;
    if (temSignatario) valorCaptador -= valorSignatario;

    resultado.push({
      escrevente_id: captador.id,
      nome: captador.nome,
      papel: 'Captador',
      pct: 20,
      fixo: temSignatario ? -valorSignatario : 0,
      total: Math.max(0, valorCaptador),
    });
    if (temExecutor) {
      resultado.push({
        escrevente_id: executor.id,
        nome: executor.nome,
        papel: 'Executor',
        pct: 6,
        fixo: 0,
        total: (base * 6) / 100,
      });
    }
    if (temSignatario) {
      resultado.push({
        escrevente_id: signatario.id,
        nome: signatario.nome,
        papel: 'Signatário',
        pct: null,
        fixo: valorSignatario,
        total: valorSignatario,
      });
    }
    return resultado;
  }

  resultado.push({
    escrevente_id: captador.id,
    nome: captador.nome,
    papel: 'Captador',
    pct: 6,
    fixo: 0,
    total: (base * 6) / 100,
  });
  if (temExecutor) {
    resultado.push({
      escrevente_id: executor.id,
      nome: executor.nome,
      papel: 'Executor',
      pct: 6,
      fixo: 0,
      total: (base * 6) / 100,
    });
  }
  if (temSignatario) {
    resultado.push({
      escrevente_id: signatario.id,
      nome: signatario.nome,
      papel: 'Signatário',
      pct: null,
      fixo: valorSignatario,
      total: valorSignatario,
    });
  }
  return resultado;
}

function enrichAtoFinance(ato) {
  const pagamentos = Array.isArray(ato.pagamentos) && ato.pagamentos.length
    ? ato.pagamentos
    : (
      toNumber(ato.valor_pago) > 0
        ? [{
            valor: ato.valor_pago,
            data_pagamento: ato.data_pagamento,
            forma_pagamento: ato.forma_pagamento,
            confirmado_financeiro: Boolean(ato.verificado_por),
            confirmado_financeiro_por: ato.verificado_por || null,
            confirmado_financeiro_em: ato.verificado_em || null,
          }]
        : []
    );
  const paymentState = buildPagamentoState(pagamentos);
  const valorPagoLancado = paymentState.lancado.valor_pago;
  const valorPagoConfirmado = paymentState.confirmado.valor_pago;
  const statusCalculado = calcStatus(
    ato.emolumentos,
    ato.repasses,
    ato.issqn,
    ato.reembolso_tabeliao,
    ato.reembolso_escrevente,
    valorPagoLancado
  );
  const statusConfirmado = calcStatus(
    ato.emolumentos,
    ato.repasses,
    ato.issqn,
    ato.reembolso_tabeliao,
    ato.reembolso_escrevente,
    valorPagoConfirmado
  );

  return {
    ...ato,
    valor_pago: valorPagoConfirmado,
    data_pagamento: paymentState.confirmado.data_pagamento,
    forma_pagamento: paymentState.confirmado.forma_pagamento,
    valor_pago_confirmado: valorPagoConfirmado,
    data_pagamento_confirmado: paymentState.confirmado.data_pagamento,
    forma_pagamento_confirmado: paymentState.confirmado.forma_pagamento,
    valor_pago_lancado: valorPagoLancado,
    data_pagamento_lancado: paymentState.lancado.data_pagamento,
    forma_pagamento_lancado: paymentState.lancado.forma_pagamento,
    pagamentos,
    status: statusConfirmado,
    status_calculado: statusCalculado,
    verificado_por: paymentState.verificado_por || null,
    verificado_em: paymentState.verificado_em || null,
    pagamentos_lancados: paymentState.totalCount,
    pagamentos_confirmados: paymentState.confirmedCount,
    pagamentos_pendentes_confirmacao: paymentState.pendingCount,
    tem_pagamento_pendente_confirmacao: paymentState.pendingCount > 0,
    total: totalAto(ato),
    comissoes: calcularComissoes(ato),
    reembolso_devido_escrevente: reembolsoDevidoEscrevente({
      ...ato,
      valor_pago: valorPagoConfirmado,
    }),
  };
}

module.exports = {
  calcStatus,
  totalAto,
  reembolsoDevidoEscrevente,
  calcularComissoes,
  enrichAtoFinance,
};
