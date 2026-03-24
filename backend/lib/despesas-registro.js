const { normalizeNullableString } = require('./audit');
const { normalizeDateValue, toMoney } = require('./pagamentos');
const { normalizeControle } = require('./pendencias');

const STATUS_FINANCEIROS_FECHADOS = new Set(['pago', 'pago_menor', 'pago_maior']);

function normalizeDespesaRegistroPayload(input = {}) {
  return {
    controle_ref: normalizeControle(input.controle_ref || input.controle),
    data_registro: normalizeDateValue(input.data_registro || input.data),
    valor: toMoney(input.valor),
    descricao: normalizeNullableString(input.descricao),
    cartorio_nome: normalizeNullableString(input.cartorio_nome),
    protocolo: normalizeNullableString(input.protocolo),
    observacoes: normalizeNullableString(input.observacoes),
  };
}

function validateDespesaRegistroPayload(payload = {}) {
  if (!payload.controle_ref) return 'Controle obrigatório';
  if (!payload.data_registro || !/^\d{4}-\d{2}-\d{2}$/.test(payload.data_registro)) {
    return 'Data do registro obrigatória';
  }
  if (toMoney(payload.valor) <= 0) return 'Valor deve ser maior que zero';
  if (!normalizeNullableString(payload.descricao)) return 'Descrição obrigatória';
  return null;
}

function buildDespesaRegistroImpact(despesa = {}, ato = null) {
  const dataRegistro = normalizeDateValue(despesa.data_registro || despesa.data);
  const dataPagamento = normalizeDateValue(ato?.data_pagamento);
  const statusAto = String(ato?.status || '').trim() || null;
  const temAtoVinculado = Boolean(
    ato?.id
    || ato?.livro
    || ato?.pagina
    || statusAto
    || dataPagamento
  );

  // Operamos com granularidade de data. Por isso, tratamos o mesmo dia do
  // pagamento como pós-pagamento para não sugerir reabertura indevida do ato.
  const despesaAposPagamento = Boolean(
    temAtoVinculado
    && dataRegistro
    && dataPagamento
    && dataRegistro >= dataPagamento
  );
  const preservaStatusAto = Boolean(
    despesaAposPagamento
    && statusAto
    && STATUS_FINANCEIROS_FECHADOS.has(statusAto)
  );

  let impactoFinanceiro = 'sem_ato_vinculado';
  if (temAtoVinculado && !dataPagamento) impactoFinanceiro = 'ato_sem_pagamento';
  else if (despesaAposPagamento) impactoFinanceiro = 'apos_pagamento_sem_recalculo';
  else if (temAtoVinculado) impactoFinanceiro = 'antes_do_pagamento';

  return {
    ato_vinculado_id: ato?.id ?? null,
    ato_vinculado_livro: ato?.livro ?? null,
    ato_vinculado_pagina: ato?.pagina ?? null,
    ato_vinculado_status: statusAto,
    ato_vinculado_data_pagamento: dataPagamento,
    despesa_apos_pagamento: despesaAposPagamento,
    preserva_status_ato: preservaStatusAto,
    impacto_financeiro: impactoFinanceiro,
  };
}

function enrichDespesaRegistroRow(row = {}) {
  return {
    ...row,
    ...buildDespesaRegistroImpact(row, {
      id: row.ato_vinculado_id,
      livro: row.ato_vinculado_livro,
      pagina: row.ato_vinculado_pagina,
      status: row.ato_vinculado_status,
      data_pagamento: row.ato_vinculado_data_pagamento,
    }),
  };
}

module.exports = {
  buildDespesaRegistroImpact,
  enrichDespesaRegistroRow,
  normalizeDespesaRegistroPayload,
  validateDespesaRegistroPayload,
};
