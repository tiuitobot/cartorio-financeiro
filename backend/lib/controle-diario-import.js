const crypto = require('crypto');
const XLSX = require('xlsx');

class ImportValidationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ImportValidationError';
    this.details = details;
  }
}

const HEADER_TO_FIELD = new Map([
  ['DATA DO ATO', 'data_ato'],
  ['ATO', 'ato'],
  ['LIVRO', 'livro'],
  ['PAGINA', 'pagina'],
  ['CONTROLE', 'controle'],
  ['ESCREVENTE', 'escrevente'],
  ['EMOLUMENTOS', 'emolumentos'],
  ['REPASSES', 'repasses'],
  ['ISSQN', 'issqn'],
  ['DATA PAGAMENTO', 'data_pagamento'],
  ['CONFIRMACAO RECEBIMENTO', 'confirmacao_recebimento'],
  ['FORMA DE PG', 'forma_pagamento'],
  ['FORMA DE PAGAMENTO', 'forma_pagamento'],
  ['CONTROLE CHEQUES', 'controle_cheques'],
]);

const REQUIRED_FIELDS = [
  'data_ato',
  'ato',
  'livro',
  'pagina',
  'controle',
  'escrevente',
  'emolumentos',
];

const FIELD_TO_LABEL = {
  data_ato: 'DATA DO ATO',
  ato: 'ATO',
  livro: 'LIVRO',
  pagina: 'PAGINA',
  controle: 'CONTROLE',
  escrevente: 'ESCREVENTE',
  emolumentos: 'EMOLUMENTOS',
  repasses: 'REPASSES',
  issqn: 'ISSQN',
  data_pagamento: 'DATA PAGAMENTO',
  confirmacao_recebimento: 'CONFIRMACAO RECEBIMENTO',
  forma_pagamento: 'FORMA DE PG',
  controle_cheques: 'CONTROLE CHEQUES',
};

function normalizeLabel(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function normalizeKey(value) {
  return normalizeLabel(value);
}

function normalizeText(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text || null;
}

function digitsOnly(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits || null;
}

function normalizeControle(value) {
  const digits = digitsOnly(value);
  if (!digits) return null;
  return digits.length < 5 ? digits.padStart(5, '0') : digits;
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toIsoDate(value) {
  if (value == null || value === '') return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const date = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
      return date.toISOString().slice(0, 10);
    }
  }

  const text = normalizeText(value);
  if (!text) return null;

  const br = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) {
    const [, dd, mm, yyyy] = br;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return text;

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return null;
}

function parseMoney(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return round2(value);

  const text = normalizeText(value);
  if (!text) return null;

  const normalized = text
    .replace(/^R\$\s*/i, '')
    .replace(/\s+/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.')
    .replace(/[^\d.-]/g, '');

  if (!normalized) return null;

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? round2(parsed) : null;
}

function normalizePaymentForm(value) {
  const text = normalizeText(value);
  if (!text) return { value: null, warning: null };

  const key = normalizeLabel(text);
  const mapping = {
    PIX: 'Pix',
    TED: 'TED',
    TRANSFERENCIA: 'TED',
    'DEPOSITO/TRANSFERENCIA': 'TED',
    'CARTAO DE DEBITO': 'Cartão Débito',
    'CARTAO DE CREDITO': 'Cartão Crédito',
    DINHEIRO: 'Dinheiro',
    BOLETO: 'Boleto',
    CHEQUE: 'Cheque',
    VALE: 'Vale',
  };

  if (mapping[key]) {
    return { value: mapping[key], warning: null };
  }

  return {
    value: text,
    warning: `Forma de pagamento fora da padronização: "${text}"`,
  };
}

function toSerializable(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  return String(value);
}

function sha256Hex(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function getHeaderMap(headerRow) {
  const fields = new Map();

  headerRow.forEach((header, index) => {
    const normalized = normalizeLabel(header);
    const field = HEADER_TO_FIELD.get(normalized);
    if (field) {
      fields.set(field, index);
    }
  });

  const missingRequired = REQUIRED_FIELDS
    .filter((field) => !fields.has(field))
    .map((field) => FIELD_TO_LABEL[field]);

  if (missingRequired.length) {
    throw new ImportValidationError('Cabeçalho da planilha inválido.', {
      missing_headers: missingRequired,
    });
  }

  return fields;
}

function buildRowRecord(rowNumber, row, headerMap) {
  const raw = {};
  for (const [field, index] of headerMap.entries()) {
    raw[field] = toSerializable(row[index]);
  }

  const payment = normalizePaymentForm(raw.forma_pagamento);
  const normalized = {
    data_ato: toIsoDate(raw.data_ato),
    tipo_ato: normalizeText(raw.ato),
    livro: digitsOnly(raw.livro),
    pagina: digitsOnly(raw.pagina),
    controle: normalizeControle(raw.controle),
    escrevente_nome: normalizeText(raw.escrevente),
    emolumentos: parseMoney(raw.emolumentos),
    repasses: parseMoney(raw.repasses),
    issqn: parseMoney(raw.issqn),
    data_pagamento: toIsoDate(raw.data_pagamento),
    confirmacao_recebimento_em: toIsoDate(raw.confirmacao_recebimento),
    confirmado_recebimento: Boolean(toIsoDate(raw.confirmacao_recebimento)),
    forma_pagamento: payment.value,
    controle_cheques: normalizeText(raw.controle_cheques),
  };

  const errors = [];
  const warnings = [];

  if (!normalized.data_ato) errors.push('DATA DO ATO ausente ou inválida');
  if (!normalized.tipo_ato) errors.push('ATO ausente');
  if (!normalized.livro) errors.push('LIVRO ausente ou inválido');
  if (!normalized.pagina) errors.push('PAGINA ausente ou inválida');
  if (!normalized.controle) errors.push('CONTROLE ausente ou inválido');
  if (!normalized.escrevente_nome) errors.push('ESCREVENTE ausente');
  if (normalized.emolumentos == null) errors.push('EMOLUMENTOS ausente ou inválido');

  if (raw.data_pagamento && !normalized.data_pagamento) {
    warnings.push('DATA PAGAMENTO presente, mas não pôde ser interpretada');
  }
  if (raw.confirmacao_recebimento && !normalized.confirmacao_recebimento_em) {
    warnings.push('CONFIRMACAO RECEBIMENTO presente, mas não pôde ser interpretada');
  }
  if (payment.warning) warnings.push(payment.warning);
  if (normalized.data_ato && Number.parseInt(normalized.data_ato.slice(0, 4), 10) < 2025) {
    warnings.push(`DATA DO ATO fora do intervalo esperado: ${normalized.data_ato}`);
  }
  if (normalized.controle && normalized.controle.length > 20) {
    warnings.push(
      `CONTROLE com ${normalized.controle.length} dígitos; excede o limite de 20 dígitos aceito pelo sistema`
    );
  }

  return {
    row_number: rowNumber,
    raw,
    normalized,
    errors,
    warnings,
  };
}

function addDuplicateWarnings(rows) {
  const controlMap = new Map();
  const bookPageMap = new Map();

  rows.forEach((row) => {
    const control = row.normalized.controle;
    if (control) {
      if (!controlMap.has(control)) controlMap.set(control, []);
      controlMap.get(control).push(row.row_number);
    }

    const { livro, pagina } = row.normalized;
    if (livro && pagina) {
      const key = `${livro}:${pagina}`;
      if (!bookPageMap.has(key)) bookPageMap.set(key, []);
      bookPageMap.get(key).push(row.row_number);
    }
  });

  rows.forEach((row) => {
    const control = row.normalized.controle;
    if (control && (controlMap.get(control) || []).length > 1) {
      row.warnings.push(`CONTROLE duplicado dentro da planilha: ${control}`);
    }

    const { livro, pagina } = row.normalized;
    if (livro && pagina) {
      const key = `${livro}:${pagina}`;
      if ((bookPageMap.get(key) || []).length > 1) {
        row.warnings.push(`LIVRO/PAGINA duplicado dentro da planilha: ${livro}/${pagina}`);
      }
    }
  });
}

function buildFileWarnings(rows) {
  const warnings = [];

  const repassesFilled = rows.some((row) => row.normalized.repasses != null);
  const issqnFilled = rows.some((row) => row.normalized.issqn != null);
  if (!repassesFilled) warnings.push('Coluna Repasses sem valores preenchidos nesta versão da planilha');
  if (!issqnFilled) warnings.push('Coluna ISSQN sem valores preenchidos nesta versão da planilha');

  return warnings;
}

function buildWorkbookPreview(buffer, fileName = 'arquivo.xlsx') {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new ImportValidationError('A planilha não possui abas legíveis.');
  }

  const worksheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: true,
    defval: null,
  });

  if (!matrix.length) {
    throw new ImportValidationError('A planilha está vazia.');
  }

  const headerRow = matrix[0];
  const headerMap = getHeaderMap(headerRow);

  const rows = matrix
    .slice(1)
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => row.some((value) => value != null && value !== ''))
    .map(({ row, rowNumber }) => buildRowRecord(rowNumber, row, headerMap));

  addDuplicateWarnings(rows);

  const summary = {
    total_rows: rows.length,
    valid_rows: rows.filter((row) => row.errors.length === 0).length,
    rows_with_errors: rows.filter((row) => row.errors.length > 0).length,
    rows_with_warnings: rows.filter((row) => row.warnings.length > 0).length,
    file_warnings: buildFileWarnings(rows),
  };

  return {
    file_name: fileName,
    file_sha256: sha256Hex(buffer),
    sheet_name: sheetName,
    headers: headerRow.map((value) => (value == null ? null : String(value))),
    rows,
    summary,
  };
}

module.exports = {
  ImportValidationError,
  buildWorkbookPreview,
  normalizeKey,
  normalizeControle,
  normalizePaymentForm,
  normalizeText,
  parseMoney,
  toIsoDate,
};
