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

function normalizeTimestampValue(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();

  const normalized = normalizeNullableString(value);
  if (!normalized) return null;

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return normalized;
  return parsed.toISOString();
}

function normalizeBooleanLike(value) {
  if (value === true || value === false) return value;
  if (value === 1 || value === '1') return true;
  if (value === 0 || value === '0') return false;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', 'sim', 'yes'].includes(normalized)) return true;
    if (['false', 'nao', 'não', 'no'].includes(normalized)) return false;
  }
  return null;
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
    confirmado_financeiro: normalizeBooleanLike(entry.confirmado_financeiro) === true,
    confirmado_financeiro_por: normalizeNullableString(entry.confirmado_financeiro_por),
    confirmado_financeiro_em: normalizeTimestampValue(entry.confirmado_financeiro_em),
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

function summarizePagamentos(pagamentos = [], options = {}) {
  const list = pagamentos.filter((pagamento) => {
    if (toMoney(pagamento.valor) <= 0) return false;
    if (options.confirmedOnly) return normalizeBooleanLike(pagamento.confirmado_financeiro) === true;
    return true;
  });
  const valorPago = list.reduce((sum, pagamento) => sum + toMoney(pagamento.valor), 0);
  const datas = list
    .map((pagamento) => pagamento.data_pagamento)
    .filter(Boolean)
    .sort();
  const formas = [...new Set(
    list
      .map((pagamento) => pagamento.forma_pagamento)
      .filter(Boolean)
  )];

  return {
    valor_pago: Number(valorPago.toFixed(2)),
    data_pagamento: datas.length ? datas[datas.length - 1] : null,
    forma_pagamento: formas.length === 0 ? null : (formas.length === 1 ? formas[0] : 'Múltiplo'),
  };
}

function buildPagamentoState(pagamentos = []) {
  const normalizedPagamentos = pagamentos
    .map((pagamento) => normalizePagamentoEntry(pagamento))
    .filter((pagamento) => toMoney(pagamento.valor) > 0);
  const pagamentosConfirmados = normalizedPagamentos.filter((pagamento) => pagamento.confirmado_financeiro);
  const confirmadosComTimestamp = pagamentosConfirmados
    .filter((pagamento) => pagamento.confirmado_financeiro_em)
    .sort((a, b) => String(a.confirmado_financeiro_em).localeCompare(String(b.confirmado_financeiro_em)));
  const lastConfirmed = confirmadosComTimestamp[confirmadosComTimestamp.length - 1] || null;
  const totalCount = normalizedPagamentos.length;
  const confirmedCount = pagamentosConfirmados.length;
  const pendingCount = totalCount - confirmedCount;
  const allConfirmed = totalCount > 0 && pendingCount === 0;

  return {
    lancado: summarizePagamentos(normalizedPagamentos),
    confirmado: summarizePagamentos(normalizedPagamentos, { confirmedOnly: true }),
    totalCount,
    confirmedCount,
    pendingCount,
    allConfirmed,
    verificado_por: allConfirmed ? lastConfirmed?.confirmado_financeiro_por || null : null,
    verificado_em: allConfirmed ? lastConfirmed?.confirmado_financeiro_em || null : null,
  };
}

function resolvePagamentoConfirmations(pagamentos = [], previousPagamentos = [], actor = {}) {
  const previousById = new Map(
    previousPagamentos
      .map((pagamento) => normalizePagamentoEntry(pagamento))
      .filter((pagamento) => pagamento.id)
      .map((pagamento) => [pagamento.id, pagamento])
  );

  return pagamentos.map((pagamento) => {
    const normalized = normalizePagamentoEntry(pagamento);
    const previous = normalized.id ? previousById.get(normalized.id) : null;
    const explicitConfirmation = normalizeBooleanLike(pagamento.confirmado_financeiro);
    const confirmed =
      explicitConfirmation === null
        ? Boolean(previous?.confirmado_financeiro)
        : explicitConfirmation;

    if (!confirmed) {
      return {
        ...normalized,
        confirmado_financeiro: false,
        confirmado_financeiro_por: null,
        confirmado_financeiro_em: null,
      };
    }

    if (previous?.confirmado_financeiro) {
      return {
        ...normalized,
        confirmado_financeiro: true,
        confirmado_financeiro_por: previous.confirmado_financeiro_por,
        confirmado_financeiro_em: previous.confirmado_financeiro_em,
      };
    }

    return {
      ...normalized,
      confirmado_financeiro: true,
      confirmado_financeiro_por: normalized.confirmado_financeiro_por || actor.nome || actor.email || 'Financeiro',
      confirmado_financeiro_em: normalized.confirmado_financeiro_em || new Date().toISOString(),
    };
  });
}

async function replacePagamentosAto(client, atoId, pagamentos = []) {
  const sanitizedPagamentos = pagamentos.filter((pagamento) => toMoney(pagamento.valor) > 0);
  const keepIds = sanitizedPagamentos
    .map((pagamento) => Number.parseInt(pagamento.id, 10))
    .filter((id) => Number.isInteger(id));

  if (keepIds.length) {
    await client.query(
      'DELETE FROM pagamentos_ato WHERE ato_id = $1 AND NOT (id = ANY($2::int[]))',
      [atoId, keepIds]
    );
  } else {
    await client.query('DELETE FROM pagamentos_ato WHERE ato_id = $1', [atoId]);
  }

  for (const pagamento of sanitizedPagamentos) {
    if (pagamento.id) {
      await client.query(
        `UPDATE pagamentos_ato
            SET valor = $3,
                data_pagamento = $4,
                forma_pagamento = $5,
                notas = $6,
                confirmado_financeiro = $7,
                confirmado_financeiro_por = $8,
                confirmado_financeiro_em = $9
          WHERE id = $1
            AND ato_id = $2`,
        [
          pagamento.id,
          atoId,
          pagamento.valor,
          pagamento.data_pagamento,
          pagamento.forma_pagamento,
          pagamento.notas,
          pagamento.confirmado_financeiro,
          pagamento.confirmado_financeiro_por,
          pagamento.confirmado_financeiro_em,
        ]
      );
      continue;
    }

    await client.query(
      `INSERT INTO pagamentos_ato(
         ato_id, valor, data_pagamento, forma_pagamento, notas,
         confirmado_financeiro, confirmado_financeiro_por, confirmado_financeiro_em
       )
       VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        atoId,
        pagamento.valor,
        pagamento.data_pagamento,
        pagamento.forma_pagamento,
        pagamento.notas,
        pagamento.confirmado_financeiro,
        pagamento.confirmado_financeiro_por,
        pagamento.confirmado_financeiro_em,
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
      confirmado_financeiro: pagamento.confirmado_financeiro === true,
      confirmado_financeiro_por: pagamento.confirmado_financeiro_por || null,
      confirmado_financeiro_em: pagamento.confirmado_financeiro_em || null,
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
  buildPagamentoState,
  resolvePagamentoConfirmations,
  replacePagamentosAto,
  serializePagamentoList,
  normalizeDateValue,
  normalizeTimestampValue,
};
