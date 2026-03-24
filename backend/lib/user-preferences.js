const LIVROS_NOTAS_COLUMN_KEYS = [
  'controle',
  'referencia',
  'data',
  'tipo_ato',
  'captador',
  'executor',
  'signatario',
  'tomador',
  'emolumentos',
  'total',
  'pago',
  'status',
];

const RELATORIOS_ATOS_COLUMN_KEYS = [
  'data_ato',
  'controle',
  'livro',
  'pagina',
  'captador',
  'nome_tomador',
  'cap_pct',
  'executor',
  'exe_pct',
  'signatario',
  'sig_val',
  'total_recibo',
  'emolumentos',
  'repasses',
  'issqn',
  'total_com',
  'remb_tab',
  'remb_esc',
  'data_pgto',
  'valor_pago',
  'forma_pgto',
  'saldo',
  'status',
];

const USER_PREFERENCE_DEFINITIONS = {
  livros_notas_colunas: LIVROS_NOTAS_COLUMN_KEYS,
  relatorios_atos_colunas: RELATORIOS_ATOS_COLUMN_KEYS,
};

function normalizeColumnSelection(value, allowedKeys) {
  if (!Array.isArray(value)) return null;

  const allowedSet = new Set(allowedKeys);
  const seen = new Set();
  const normalized = [];

  for (const item of value) {
    if (typeof item !== 'string') continue;
    const key = item.trim();
    if (!allowedSet.has(key) || seen.has(key)) continue;
    seen.add(key);
    normalized.push(key);
  }

  return normalized;
}

function sanitizeUserPreferences(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};

  const sanitized = {};
  for (const [key, allowedKeys] of Object.entries(USER_PREFERENCE_DEFINITIONS)) {
    if (!Object.prototype.hasOwnProperty.call(input, key)) continue;
    const normalized = normalizeColumnSelection(input[key], allowedKeys);
    if (normalized !== null) {
      sanitized[key] = normalized;
    }
  }

  return sanitized;
}

function mergeUserPreferences(current = {}, patch = {}) {
  return {
    ...sanitizeUserPreferences(current),
    ...sanitizeUserPreferences(patch),
  };
}

module.exports = {
  LIVROS_NOTAS_COLUMN_KEYS,
  RELATORIOS_ATOS_COLUMN_KEYS,
  USER_PREFERENCE_DEFINITIONS,
  normalizeColumnSelection,
  sanitizeUserPreferences,
  mergeUserPreferences,
};
