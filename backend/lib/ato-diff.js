const { formatDatePtBr, normalizeNullableString } = require('./audit');
const { normalizePagamentoEntry, serializePagamentoList, toMoney } = require('./pagamentos');

function formatMoney(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(toMoney(value));
}

function formatValue(value, formatter) {
  if (value === null || value === undefined || value === '') return 'vazio';
  return formatter ? formatter(value) : String(value);
}

function normalizeDiffValue(value) {
  if (typeof value === 'string') {
    return normalizeNullableString(value);
  }

  return value ?? null;
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

function normalizeNumberLike(value) {
  if (value === null || value === undefined || value === '') return null;
  return Number(toMoney(value).toFixed(2));
}

function normalizeIdLike(value) {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : value;
}

function formatIdName(value, lookup = {}) {
  if (!value) return 'vazio';
  return lookup[value] || `#${value}`;
}

function formatPaymentSummary(pagamentos = []) {
  if (!pagamentos.length) return 'sem pagamentos';

  return pagamentos.map((pagamento) => {
    const normalized = normalizePagamentoEntry(pagamento);
    const parts = [formatMoney(normalized.valor)];
    if (normalized.data_pagamento) parts.push(`em ${normalized.data_pagamento}`);
    if (normalized.forma_pagamento) parts.push(`via ${normalized.forma_pagamento}`);
    parts.push(normalized.confirmado_financeiro ? '[conferido]' : '[aguardando conferência]');
    if (normalized.notas) parts.push(`(${normalized.notas})`);
    return parts.join(' ');
  }).join(' | ');
}

function buildAtoDiffMessage({
  previousAto,
  nextAto,
  previousPagamentos = [],
  nextPagamentos = [],
  escreventesById = {},
  actorName = 'Sistema',
}) {
  const changes = [];
  const fields = [
    { key: 'controle', label: 'Controle' },
    { key: 'livro', label: 'Livro' },
    { key: 'pagina', label: 'Página' },
    { key: 'data_ato', label: 'Data do ato', normalize: normalizeDateValue, format: normalizeDateValue },
    { key: 'tipo_ato', label: 'Tipo de ato' },
    { key: 'nome_tomador', label: 'Tomador' },
    { key: 'captador_id', label: 'Captador', normalize: normalizeIdLike, format: (value) => formatIdName(value, escreventesById) },
    { key: 'executor_id', label: 'Executor', normalize: normalizeIdLike, format: (value) => formatIdName(value, escreventesById) },
    { key: 'signatario_id', label: 'Signatário', normalize: normalizeIdLike, format: (value) => formatIdName(value, escreventesById) },
    { key: 'emolumentos', label: 'Emolumentos', normalize: normalizeNumberLike, format: formatMoney },
    { key: 'repasses', label: 'Repasses', normalize: normalizeNumberLike, format: formatMoney },
    { key: 'issqn', label: 'ISSQN', normalize: normalizeNumberLike, format: formatMoney },
    { key: 'reembolso_tabeliao', label: 'Reembolso tabelião', normalize: normalizeNumberLike, format: formatMoney },
    { key: 'reembolso_escrevente', label: 'Reembolso escrevente', normalize: normalizeNumberLike, format: formatMoney },
    { key: 'escrevente_reembolso_id', label: 'Escrevente reembolso', normalize: normalizeIdLike, format: (value) => formatIdName(value, escreventesById) },
    { key: 'controle_cheques', label: 'Controle cheques' },
    { key: 'verificado_por', label: 'Recebimento confirmado por' },
    { key: 'status', label: 'Status' },
    { key: 'notas', label: 'Notas' },
  ];

  for (const field of fields) {
    const previous = field.normalize ? field.normalize(previousAto?.[field.key]) : normalizeDiffValue(previousAto?.[field.key]);
    const next = field.normalize ? field.normalize(nextAto?.[field.key]) : normalizeDiffValue(nextAto?.[field.key]);

    if (String(previous ?? '') === String(next ?? '')) continue;

    changes.push(
      `${field.label}: ${formatValue(previous, field.format)} -> ${formatValue(next, field.format)}`
    );
  }

  if (serializePagamentoList(previousPagamentos) !== serializePagamentoList(nextPagamentos)) {
    changes.push(`Pagamentos: ${formatPaymentSummary(previousPagamentos)} -> ${formatPaymentSummary(nextPagamentos)}`);
  }

  if (!changes.length) return null;

  return {
    autor: actorName,
    mensagem: `Alterações automáticas: ${changes.join('; ')}`,
    data: formatDatePtBr(),
    status: 'aprovado',
  };
}

module.exports = {
  buildAtoDiffMessage,
};
