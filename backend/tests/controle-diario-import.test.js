const test = require('node:test');
const assert = require('node:assert/strict');
const XLSX = require('xlsx');
const {
  buildWorkbookPreview,
  normalizePaymentForm,
  parseMoney,
  toIsoDate,
} = require('../lib/controle-diario-import');

function buildWorkbookBuffer(rows) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Livro de Escrituras');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

test('parseMoney normaliza moeda brasileira e números puros', () => {
  assert.equal(parseMoney('R$ 5.427,43'), 5427.43);
  assert.equal(parseMoney(93.53), 93.53);
  assert.equal(parseMoney(''), null);
});

test('normalizePaymentForm normaliza variações conhecidas', () => {
  assert.deepEqual(normalizePaymentForm('PIX'), { value: 'Pix', warning: null });
  assert.deepEqual(normalizePaymentForm('Cartão de Débito'), {
    value: 'Cartão Débito',
    warning: null,
  });
  assert.deepEqual(normalizePaymentForm('DEPÓSITO/TRANSFERÊNCIA'), { value: 'TED', warning: null });
  assert.deepEqual(normalizePaymentForm('vale'), { value: 'Vale', warning: null });
});

test('toIsoDate converte datas excel e texto brasileiro', () => {
  assert.equal(toIsoDate(new Date('2026-01-12T00:00:00Z')), '2026-01-12');
  assert.equal(toIsoDate('12/01/2026'), '2026-01-12');
});

test('buildWorkbookPreview gera preview com erros e alertas de domínio já conhecidos', () => {
  const buffer = buildWorkbookBuffer([
    [
      null,
      'DATA DO ATO ',
      'ATO ',
      'Livro',
      'Página',
      'CONTROLE ',
      'ESCREVENTE ',
      'EMOLUMENTOS ',
      'Repasses',
      'ISSQN',
      'Data Pagamento ',
      'Confirmação Recebimento ',
      'FORMA DE PG ',
      'CONTROLE CHEQUES',
    ],
    [
      null,
      new Date('2026-01-12T00:00:00Z'),
      'PROCURAÇÃO',
      '004369',
      '257',
      1,
      'MARIA AUGUSTA DO VAL',
      'R$ 656,36',
      null,
      null,
      null,
      null,
      'Pix',
      null,
    ],
    [
      null,
      new Date('1908-09-30T00:00:00Z'),
      'VENDA E COMPRA',
      '004380',
      '265',
      1009996,
      'SONIA',
      5661.57,
      null,
      null,
      null,
      null,
      'DEPÓSITO/TRANSFERÊNCIA',
      null,
    ],
    [
      null,
      null,
      'CERTIDAO',
      '000012',
      null,
      1010001,
      'MIRIAM',
      93.53,
      null,
      null,
      null,
      null,
      null,
      null,
    ],
  ]);

  const preview = buildWorkbookPreview(buffer, 'controle.xlsx');

  assert.equal(preview.file_name, 'controle.xlsx');
  assert.equal(preview.summary.total_rows, 3);
  assert.equal(preview.summary.valid_rows, 2);
  assert.equal(preview.summary.rows_with_errors, 1);
  assert.equal(preview.rows[0].normalized.controle, '00001');
  assert.equal(preview.rows[1].warnings.some((item) => item.includes('CONTROLE com 7 dígitos')), false);
  assert.equal(preview.rows[1].warnings.some((item) => item.includes('fora do intervalo esperado')), true);
  assert.equal(preview.rows[2].errors.includes('DATA DO ATO ausente ou inválida'), true);
  assert.equal(preview.summary.file_warnings.includes('Coluna Repasses sem valores preenchidos nesta versão da planilha'), true);
  assert.equal(preview.summary.file_warnings.includes('Coluna ISSQN sem valores preenchidos nesta versão da planilha'), true);
});
