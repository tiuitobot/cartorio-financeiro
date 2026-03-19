export const padControle = v => v ? String(v).replace(/\D/g, '').padStart(5, '0') : '00000';
export const fmtLivro   = v => v ? `L${String(v).replace(/\D/g, '').padStart(5, '0')}` : '—';
export const fmtPagina  = v => v ? `P${String(v).replace(/\D/g, '').padStart(3, '0')}` : '—';
export const fmtRef     = (l, p) => l && p ? `${fmtLivro(l)}${fmtPagina(p)}` : '—';
export const toMoneyNumber = (v) => {
  const parsed = Number.parseFloat(v ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};
export const fmt        = v => toMoneyNumber(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const fmtDate    = d => {
  if (!d) return '—';
  const raw = String(d).trim();
  if (!raw) return '—';

  const parsed = raw.includes('T')
    ? new Date(raw)
    : new Date(`${raw}T12:00:00`);

  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString('pt-BR');
};
export const sLabel     = s => ({ pago: 'Pago', pendente: 'Pendente', pago_menor: 'Pago a menor', pago_maior: 'Pago a maior' }[s] || s);
export const sColor     = s => ({ pago: '#22c55e', pendente: '#f59e0b', pago_menor: '#ef4444', pago_maior: '#3b82f6' }[s] || '#94a3b8');
export const parseRef   = str => { const m = str.replace(/\s/g, '').toUpperCase().match(/^L(\d+)P(\d+)$/); return m ? { livro: parseInt(m[1]), pagina: parseInt(m[2]) } : null; };
