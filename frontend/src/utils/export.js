import * as XLSX from 'xlsx';
import { padControle, fmtLivro, fmtPagina, fmtRef, fmt, fmtDate, sLabel, sColor } from './format.js';

export function exportXLSX(sheetData, sheetName, filename) {
  try {
    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([out], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    if (!sheetData.length) return;
    const headers = Object.keys(sheetData[0]);
    const csv = [
      headers.join(';'),
      ...sheetData.map(r => headers.map(h => `"${(r[h] ?? '').toString().replace(/"/g, '""')}"`).join(';')),
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename.replace('.xlsx', '.csv'); a.click();
    URL.revokeObjectURL(url);
  }
}

export const ALL_COLS = [
  { key: 'data_ato',     label: 'Data Lavratura',      def: true,  get: (a)     => fmtDate(a.data_ato),         raw: (a)     => a.data_ato || '' },
  { key: 'controle',     label: 'Controle',             def: true,  get: (a)     => padControle(a.controle),     raw: (a)     => padControle(a.controle) },
  { key: 'livro',        label: 'Livro',                def: true,  get: (a)     => fmtLivro(a.livro),           raw: (a)     => fmtLivro(a.livro) },
  { key: 'pagina',       label: 'Página',               def: true,  get: (a)     => fmtPagina(a.pagina),         raw: (a)     => fmtPagina(a.pagina) },
  { key: 'captador',     label: 'Captador',             def: true,  get: (a, e)  => e.find(x => x.id === a.captador_id)?.nome || '—',  raw: (a, e) => e.find(x => x.id === a.captador_id)?.nome || '' },
  { key: 'nome_tomador', label: 'Nome do Tomador',      def: false, get: (a)     => a.nome_tomador || '—',       raw: (a)     => a.nome_tomador || '' },
  { key: 'cap_pct',      label: 'Comissão Captador',    def: false, get: (a)     => { const c = (a.comissoes||[]).find(x => x.papel === 'Captador');  return c ? fmt(c.total) : '—'; }, raw: (a) => { const c = (a.comissoes||[]).find(x => x.papel === 'Captador');  return c ? c.total : 0; } },
  { key: 'executor',     label: 'Executor',             def: false, get: (a, e)  => e.find(x => x.id === a.executor_id)?.nome || '—',  raw: (a, e) => e.find(x => x.id === a.executor_id)?.nome || '' },
  { key: 'exe_pct',      label: 'Comissão Executor',    def: false, get: (a)     => { const c = (a.comissoes||[]).find(x => x.papel === 'Executor');  return c ? fmt(c.total) : '—'; }, raw: (a) => { const c = (a.comissoes||[]).find(x => x.papel === 'Executor');  return c ? c.total : 0; } },
  { key: 'signatario',   label: 'Signatário',           def: false, get: (a, e)  => e.find(x => x.id === a.signatario_id)?.nome || '—', raw: (a, e) => e.find(x => x.id === a.signatario_id)?.nome || '' },
  { key: 'sig_val',      label: 'Comissão Signatário',  def: false, get: (a)     => { const c = (a.comissoes||[]).find(x => x.papel === 'Signatário'); return c ? fmt(c.total) : '—'; }, raw: (a) => { const c = (a.comissoes||[]).find(x => x.papel === 'Signatário'); return c ? c.total : 0; } },
  { key: 'total_recibo', label: 'Total Recibo',         def: true,  get: (a)     => fmt(a.total),            raw: (a)     => a.total },
  { key: 'emolumentos',  label: 'Emolumentos',          def: true,  get: (a)     => fmt(a.emolumentos),          raw: (a)     => a.emolumentos },
  { key: 'repasses',     label: 'Repasses',             def: true,  get: (a)     => fmt(a.repasses),             raw: (a)     => a.repasses },
  { key: 'issqn',        label: 'ISSQN',                def: false, get: (a)     => fmt(a.issqn),                raw: (a)     => a.issqn },
  { key: 'total_com',    label: 'Total Comissões',      def: false, get: (a)     => fmt((a.comissoes||[]).reduce((s, c) => s + c.total, 0)), raw: (a) => (a.comissoes||[]).reduce((s, c) => s + c.total, 0) },
  { key: 'remb_tab',     label: 'Reembolso Tabelião',   def: false, get: (a)     => fmt(a.reembolso_tabeliao),   raw: (a)     => a.reembolso_tabeliao },
  { key: 'remb_esc',     label: 'Reembolso Escrevente', def: false, get: (a)     => fmt(a.reembolso_escrevente), raw: (a)     => a.reembolso_escrevente },
  { key: 'data_pgto',    label: 'Data Pagamento',       def: true,  get: (a)     => fmtDate(a.data_pagamento),   raw: (a)     => a.data_pagamento || '' },
  { key: 'valor_pago',   label: 'Valor Pago',           def: true,  get: (a)     => fmt(a.valor_pago),           raw: (a)     => a.valor_pago },
  { key: 'forma_pgto',   label: 'Forma Pagamento',      def: false, get: (a)     => a.forma_pagamento || '—',    raw: (a)     => a.forma_pagamento || '' },
  { key: 'saldo',        label: 'Saldo',                def: true,  get: (a)     => fmt(a.total - a.valor_pago), raw: (a) => a.total - a.valor_pago },
  { key: 'status',       label: 'Status',               def: true,  get: (a)     => sLabel(a.status),            raw: (a)     => sLabel(a.status) },
];
