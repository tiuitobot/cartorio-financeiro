import { fmt, sLabel, sColor } from '../utils/format.js';

export default function Dashboard({ atos, escreventes }) {
  const totalFaturado = atos.reduce((s, a) => s + a.total, 0);
  const totalRecebido = atos.reduce((s, a) => s + a.valor_pago, 0);
  const totalPendente = atos.filter(a => a.status === 'pendente' || a.status === 'pago_menor').reduce((s, a) => s + Math.max(0, a.total - a.valor_pago), 0);

  const meses       = [...new Set(atos.map(a => a.data_ato?.slice(0, 7)).filter(Boolean))].sort();
  const ultimoMes   = meses[meses.length - 2];
  const saldoHistorico      = ultimoMes ? atos.filter(a => a.data_ato?.startsWith(ultimoMes) || a.data_ato < ultimoMes).reduce((s, a) => s + Math.max(0, a.total - a.valor_pago), 0) : 0;
  const saldoAtualDessesAtos = ultimoMes ? atos.filter(a => a.data_ato < (ultimoMes + '-32')).reduce((s, a) => s + Math.max(0, a.total - a.valor_pago), 0) : 0;

  const topCobradores = escreventes.map(e => {
    const atosE = atos.filter(a => a.captador_id === e.id && a.data_pagamento && a.data_ato);
    if (!atosE.length) return null;
    const media = atosE.reduce((s, a) => { const d = new Date(a.data_pagamento) - new Date(a.data_ato); return s + d; }, 0) / atosE.length;
    return { nome: e.nome, mediaDias: Math.round(media / 86400000), qtd: atosE.length };
  }).filter(Boolean).sort((a, b) => a.mediaDias - b.mediaDias).slice(0, 5);

  const totalEmolumentos  = atos.reduce((s, a) => s + a.emolumentos, 0);
  const emolAReceber      = atos.filter(a => a.status === 'pendente' || a.status === 'pago_menor').reduce((s, a) => s + Math.max(0, a.emolumentos - (a.valor_pago > 0 ? Math.min(a.emolumentos, a.valor_pago) : 0)), 0);
  const totalRepassesISSQN = atos.reduce((s, a) => s + a.repasses + a.issqn, 0);

  const metrics = [
    { l: 'Total Faturado',          v: fmt(totalFaturado),     i: '📋', c: '#1e3a5f', bg: '#eff6ff' },
    { l: 'Total Recebido',          v: fmt(totalRecebido),     i: '✅', c: '#16a34a', bg: '#f0fdf4' },
    { l: 'Saldo a Receber',         v: fmt(totalPendente),     i: '⏳', c: '#dc2626', bg: '#fef2f2' },
    { l: 'Total Emolumentos',       v: fmt(totalEmolumentos),  i: '⚖️', c: '#7c3aed', bg: '#f5f3ff' },
    { l: 'Emolumentos a Receber',   v: fmt(emolAReceber),      i: '💰', c: '#9333ea', bg: '#fdf4ff' },
    { l: 'Total Repasses + ISSQN',  v: fmt(totalRepassesISSQN), i: '🔁', c: '#d97706', bg: '#fffbeb' },
  ];
  const porStatus = ['pago', 'pendente', 'pago_menor', 'pago_maior'].map(s => ({ l: sLabel(s), n: atos.filter(a => a.status === s).length, c: sColor(s) }));
  const topCapt   = escreventes.map(e => ({ nome: e.nome, total: atos.filter(a => a.captador_id === e.id).reduce((s, a) => s + a.emolumentos, 0), qtd: atos.filter(a => a.captador_id === e.id).length })).sort((a, b) => b.total - a.total).slice(0, 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {metrics.map((m, i) => (
          <div key={i} style={{ background: m.bg, borderRadius: 14, padding: '18px 22px', border: `1.5px solid ${m.c}22`, display: 'flex', gap: 14, alignItems: 'center' }}>
            <span style={{ fontSize: 28 }}>{m.i}</span>
            <div><div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{m.l}</div><div style={{ fontSize: 20, fontWeight: 800, color: m.c, marginTop: 2 }}>{m.v}</div></div>
          </div>
        ))}
      </div>

      {ultimoMes && (
        <div style={{ background: '#fff', borderRadius: 14, padding: '18px 22px', border: '1px solid #e8edf5', boxShadow: '0 2px 16px #0f2a5511' }}>
          <div style={{ fontWeight: 700, color: '#1e3a5f', marginBottom: 12, fontSize: 15 }}>📆 Situação Histórica — {ultimoMes}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ background: '#fef2f2', borderRadius: 10, padding: '14px 18px' }}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Saldo em aberto em {ultimoMes}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#dc2626' }}>{fmt(saldoHistorico)}</div>
            </div>
            <div style={{ background: saldoAtualDessesAtos > 0 ? '#fff7ed' : '#f0fdf4', borderRadius: 10, padding: '14px 18px' }}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Saldo atual (créditos até {ultimoMes})</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: saldoAtualDessesAtos > 0 ? '#d97706' : '#16a34a' }}>{fmt(saldoAtualDessesAtos)}</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #e8edf5', boxShadow: '0 2px 16px #0f2a5511' }}>
          <div style={{ fontWeight: 700, color: '#1e3a5f', marginBottom: 16, fontSize: 15 }}>📊 Atos por Status</div>
          {porStatus.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 12, height: 12, borderRadius: '50%', background: s.c }} /><span style={{ fontSize: 14 }}>{s.l}</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ height: 8, width: Math.max(8, s.n * 40), background: s.c, borderRadius: 4, opacity: 0.7 }} />
                <span style={{ fontWeight: 700, color: s.c, minWidth: 24, textAlign: 'right' }}>{s.n}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #e8edf5', boxShadow: '0 2px 16px #0f2a5511' }}>
          <div style={{ fontWeight: 700, color: '#1e3a5f', marginBottom: 16, fontSize: 15 }}>🏆 Top Captadores</div>
          {topCapt.map((e, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, padding: '6px 10px', background: i === 0 ? '#f0f7ff' : '#fafbfc', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#1e3a5f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{i + 1}</span>
                <div><div style={{ fontWeight: 600, fontSize: 13 }}>{e.nome}</div><div style={{ fontSize: 11, color: '#94a3b8' }}>{e.qtd} atos</div></div>
              </div>
              <span style={{ fontWeight: 700, color: '#1e3a5f', fontSize: 13 }}>{fmt(e.total)}</span>
            </div>
          ))}
        </div>
        <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #e8edf5', boxShadow: '0 2px 16px #0f2a5511' }}>
          <div style={{ fontWeight: 700, color: '#1e3a5f', marginBottom: 16, fontSize: 15 }}>⚡ Top Cobradores (tempo médio)</div>
          {topCobradores.length === 0
            ? <div style={{ color: '#94a3b8', fontSize: 13 }}>Dados insuficientes.</div>
            : topCobradores.map((e, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, padding: '6px 10px', background: i === 0 ? '#f0fdf4' : '#fafbfc', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#16a34a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{i + 1}</span>
                  <div><div style={{ fontWeight: 600, fontSize: 13 }}>{e.nome}</div><div style={{ fontSize: 11, color: '#94a3b8' }}>{e.qtd} atos pagos</div></div>
                </div>
                <span style={{ fontWeight: 700, color: '#16a34a', fontSize: 13 }}>{e.mediaDias}d</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}
