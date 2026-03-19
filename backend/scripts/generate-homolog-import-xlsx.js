#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const rootDir = path.resolve(__dirname, '..', '..');
const defaultOutput = path.join(rootDir, 'tmp', 'controle_diario_homologacao.xlsx');
const outputPath = path.resolve(process.argv[2] || defaultOutput);

const rows = [
  [
    'DATA DO ATO',
    'ATO',
    'Livro',
    'Página',
    'CONTROLE',
    'ESCREVENTE',
    'EMOLUMENTOS',
    'Repasses',
    'ISSQN',
    'Data Pagamento',
    'Confirmação Recebimento',
    'FORMA DE PG',
    'CONTROLE CHEQUES',
  ],
  ['19/03/2026', 'PROCURAÇÃO', '880', '1', '991001', 'Maria Santos', '850,00', '35,00', '12,50', '19/03/2026', '19/03/2026', 'Pix', 'CHK-H001'],
  ['19/03/2026', 'CERTIDÃO', '880', '2', '991002', 'João Silva', '210,00', '', '', '', '', 'Dinheiro', ''],
  ['19/03/2026', 'ESCRITURA', '880', '3', '991003', 'Ana Costa', '2450,00', '120,00', '72,00', '', '', 'Depósito/Transferência', ''],
  ['19/03/2026', 'AUTENTICAÇÃO', '880', '4', '991004', 'Pedro Oliveira', '96,00', '', '', '19/03/2026', '', 'Cartão de Débito', ''],
  ['19/03/2026', 'RECONHECIMENTO DE FIRMA', '880', '5', '1009996', 'Carlos Mendes', '145,00', '', '', '', '', 'Cheque', 'CHQ-009'],
  ['19/03/2026', '', '880', '6', '991006', 'Maria Santos', '1200,00', '', '', '', '', 'Dinheiro', ''],
  ['', 'DOAÇÃO', '880', '7', '991007', 'João Silva', '980,00', '', '', '', '', 'Pix', ''],
  ['19/03/2026', 'TESTAMENTO', '880', '', '991008', 'Ana Costa', '3150,00', '180,00', '94,50', '', '', 'Transferência', ''],
  ['19/03/2026', 'PROCURAÇÃO', '880', '9', '991001', 'Maria Santos', '650,00', '', '', '', '', 'Pix', ''],
  ['19/03/2026', 'DECLARAÇÃO', '880', '2', '991010', 'João Silva', '330,00', '', '', '', '', 'Dinheiro', ''],
];

function main() {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Livro de Escrituras');
  XLSX.writeFile(workbook, outputPath);

  console.log(JSON.stringify({
    output: outputPath,
    total_rows: rows.length - 1,
    expected_valid_rows: 7,
    expected_error_rows: 3,
    notes: [
      'inclui nomes compatíveis com a seed de homologação',
      'inclui controle longo com 7 dígitos',
      'inclui linhas inválidas para preview',
      'inclui duplicidade de controle e de livro/página para testar alertas',
    ],
  }, null, 2));
}

main();
