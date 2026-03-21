const { normalizeNullableString } = require('./audit');

function toMoney(value) {
  const parsed = Number.parseFloat(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeDateValue(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);

  const normalized = normalizeNullableString(value);
  if (!normalized) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) return normalized.slice(0, 10);

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return normalized;
  return parsed.toISOString().slice(0, 10);
}

function normalizeFormaPagamento(value) {
  const text = normalizeNullableString(value);
  if (!text) return null;

  const key = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

  const mapping = {
    PIX: 'Pix',
    TED: 'TED',
    BOLETO: 'Boleto',
    VALE: 'Vale',
    DINHEIRO: 'Dinheiro',
    CHEQUE: 'Cheque',
    TRANSFERENCIA: 'TED',
    'DEPOSITO/TRANSFERENCIA': 'TED',
    'DEPOSITO / TRANSFERENCIA': 'TED',
    'DEPOSITO TRANSFERENCIA': 'TED',
    'CARTAO DE DEBITO': 'Cartão Débito',
    'CARTAO DE CREDITO': 'Cartão Crédito',
    'CARTAO DEBITO': 'Cartão Débito',
    'CARTAO CREDITO': 'Cartão Crédito',
  };

  return mapping[key] || text;
}

function normalizePagamentoEntry(entry = {}) {
  return {
    id: Number.isInteger(Number.parseInt(entry.id, 10)) ? Number.parseInt(entry.id, 10) : null,
    valor: toMoney(entry.valor),
    data_pagamento: normalizeDateValue(entry.data_pagamento || entry.data),
    forma_pagamento: normalizeFormaPagamento(entry.forma_pagamento),
    notas: normalizeNullableString(entry.notas),
  };
}

function normalizePagamentosPayload(payloadPagamentos, legacy = {}) {
  if (Array.isArray(payloadPagamentos)) {
    return payloadPagamentos
      .map((item) => normalizePagamentoEntry(item))
      .filter((item) =>
        item.valor > 0
        || item.data_pagamento
        || item.forma_pagamento
        || item.notas
      );
  }

  const legacyEntry = normalizePagamentoEntry({
    valor: legacy.valor_pago,
    data_pagamento: legacy.data_pagamento,
    forma_pagamento: legacy.forma_pagamento,
  });

  if (legacyEntry.valor <= 0 && !legacyEntry.data_pagamento && !legacyEntry.forma_pagamento) {
    return [];
  }

  return [legacyEntry];
}

function validatePagamentos(pagamentos = []) {
  for (const [index, pagamento] of pagamentos.entries()) {
    if (pagamento.valor <= 0) {
      return `Pagamento ${index + 1} precisa ter valor maior que zero`;
    }
  }

  return null;
}

function summarizePagamentos(pagamentos = []) {
  const valorPago = pagamentos.reduce((sum, pagamento) => sum + toMoney(pagamento.valor), 0);
  const datas = pagamentos
    .map((pagamento) => pagamento.data_pagamento)
    .filter(Boolean)
    .sort();
  const formas = [...new Set(
    pagamentos
      .map((pagamento) => pagamento.forma_pagamento)
      .filter(Boolean)
  )];

  return {
    valor_pago: Number(valorPago.toFixed(2)),
    data_pagamento: datas.length ? datas[datas.length - 1] : null,
    forma_pagamento: formas.length === 0 ? null : (formas.length === 1 ? formas[0] : 'Múltiplo'),
  };
}

async function replacePagamentosAto(client, atoId, pagamentos = []) {
  await client.query('DELETE FROM pagamentos_ato WHERE ato_id = $1', [atoId]);

  for (const pagamento of pagamentos) {
    await client.query(
      `INSERT INTO pagamentos_ato(ato_id, valor, data_pagamento, forma_pagamento, notas)
       VALUES($1,$2,$3,$4,$5)`,
      [
        atoId,
        pagamento.valor,
        pagamento.data_pagamento,
        pagamento.forma_pagamento,
        pagamento.notas,
      ]
    );
  }
}

function serializePagamentoList(pagamentos = []) {
  return pagamentos
    .map((pagamento) => normalizePagamentoEntry(pagamento))
    .sort((a, b) => {
      const dataA = a.data_pagamento || '';
      const dataB = b.data_pagamento || '';
      if (dataA !== dataB) return dataA.localeCompare(dataB);
      if (a.valor !== b.valor) return a.valor - b.valor;
      return String(a.forma_pagamento || '').localeCompare(String(b.forma_pagamento || ''));
    })
    .map((pagamento) => JSON.stringify({
      valor: Number(toMoney(pagamento.valor).toFixed(2)),
      data_pagamento: pagamento.data_pagamento || null,
      forma_pagamento: pagamento.forma_pagamento || null,
      notas: pagamento.notas || null,
    }))
    .join('|');
}

module.exports = {
  toMoney,
  normalizeFormaPagamento,
  normalizePagamentoEntry,
  normalizePagamentosPayload,
  validatePagamentos,
  summarizePagamentos,
  replacePagamentosAto,
  serializePagamentoList,
  normalizeDateValue,
};
