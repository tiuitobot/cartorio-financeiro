import { useState, useMemo } from 'react';
import { Card, FInput, FSel, Btn, Badge } from '../components/ui/index.jsx';
import { padControle, fmt, fmtDate, sLabel, sColor, parseRef } from '../utils/format.js';
import { exportXLSX, ALL_COLS } from '../utils/export.js';
import { FORMAS_PAGAMENTO } from '../constants.js';
import ModalPgtoReembolso from '../components/modals/ModalPgtoReembolso.jsx';

// Fix Bug 2: mês e ano correntes como padrão
const hoje = new Date();
const mesAtual  = hoje.toISOString().slice(0, 7);
const anoInicio = `${hoje.getFullYear()}-01-01`;
const anoFim    = `${hoje.getFullYear()}-12-31`;

const TH = ({ c }) => <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: 12, textTransform: 'uppercase', whiteSpace: 'nowrap', background: '#f1f5f9' }}>{c}</th>;
const TD = ({ c, bold, color }) => <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', fontWeight: bold ? 700 : 400, color: color || '#1e293b' }}>{c}</td>;

export default function Relatorios({ atos, escreventes, pagamentosReembolso, onAddPagamento, onConfirmarReembolso }) {
  const [tab, setTab]                   = useState('atos');
  const [selectedCols, setSelectedCols] = useState(() => ALL_COLS.filter(c => c.def).map(c => c.key));
  const [showColPanel, setShowColPanel] = useState(false);
  const [fStatus, setFStatus]           = useState('');
  const [fCaptador, setFCaptador]       = useState('');
  const [fInicio, setFInicio]           = useState('');
  const [fFim, setFFim]                 = useState('');
  const [fBusca, setFBusca]             = useState('');
  const [mesFat, setMesFat]             = useState(mesAtual);
  const [mesRec, setMesRec]             = useState(mesAtual);
  const [comInicio, setComInicio]       = useState(anoInicio);
  const [comFim, setComFim]             = useState(anoFim);
  const [comEscIds, setComEscIds]       = useState([]);
  const [modalReembolso, setModalReembolso] = useState(null);

  const tabs = [
    { key: 'atos',       label: '📋 Atos' },
    { key: 'mensal',     label: '📅 Mensal' },
    { key: 'comissoes',  label: '📊 Comissões' },
    { key: 'reembolsos', label: '🔄 Reembolsos' },
  ];

  const atosFiltrados = useMemo(() => {
    let l = [...atos];
    if (fStatus)   l = l.filter(a => a.status === fStatus);
    if (fCaptador) l = l.filter(a => a.captador_id === parseInt(fCaptador));
    if (fInicio)   l = l.filter(a => a.data_ato >= fInicio);
    if (fFim)      l = l.filter(a => a.data_ato <= fFim);
    if (fBusca) {
      const ref = parseRef(fBusca);
      if (ref) { l = l.filter(a => parseInt(a.livro) === ref.livro && parseInt(a.pagina) === ref.pagina); }
      else { const b = fBusca.toLowerCase(); l = l.filter(a => padControle(a.controle).includes(b) || a.controle.includes(b)); }
    }
    return l;
  }, [atos, fStatus, fCaptador, fInicio, fFim, fBusca]);

  const toggleCol = k => setSelectedCols(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);
  const handleExportAtos = () => {
    const data = atosFiltrados.map(a => { const row = {}; selectedCols.forEach(k => { const c = ALL_COLS.find(x => x.key === k); if (c) row[c.label] = c.raw(a, escreventes); }); return row; });
    exportXLSX(data, 'Atos', 'relatorio_atos.xlsx');
  };

  const atosFat = useMemo(() => atos.filter(a => a.data_ato?.startsWith(mesFat)), [atos, mesFat]);
  const atosRec = useMemo(() => atos.filter(a => a.data_pagamento?.startsWith(mesRec)), [atos, mesRec]);

  const escFiltrados = comEscIds.length > 0 ? escreventes.filter(e => comEscIds.includes(e.id)) : escreventes;
  const dadosCom = useMemo(() => escFiltrados.map(e => {
    const atosE = atos.filter(a => a.captador_id === e.id && (!comInicio || a.data_ato >= comInicio) && (!comFim || a.data_ato <= comFim));
    const emol  = atosE.reduce((s, a) => s + a.emolumentos, 0);
    const coms  = atosE.reduce((s, a) => { const c = (a.comissoes||[]).find(x => x.escrevente_id === e.id); return s + (c ? c.total : 0); }, 0);
    return { nome: e.nome, taxa: e.taxa, qtdAtos: atosE.length, emolumentos: emol, comissoes: coms, pct: emol > 0 ? (coms / emol * 100) : 0 };
  }).filter(x => x.qtdAtos > 0), [atos, escFiltrados, comInicio, comFim, escreventes]);

  const dadosRembEsc = escreventes.map(e => {
    const lancado = atos.filter(a => a.escrevente_reembolso_id === e.id).reduce((s, a) => s + a.reembolso_devido_escrevente, 0);
    const pago    = pagamentosReembolso.filter(p => p.escrevente_id === e.id).reduce((s, p) => s + p.valor, 0);
    return { ...e, lancado, pago, saldo: lancado - pago };
  }).filter(e => e.lancado > 0 || e.pago > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 12, padding: 4 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 9, background: tab === t.key ? '#fff' : 'transparent', color: tab === t.key ? '#1e3a5f' : '#64748b', fontWeight: tab === t.key ? 700 : 500, fontSize: 13, cursor: 'pointer', boxShadow: tab === t.key ? '0 1px 4px #0f2a5520' : 'none' }}>{t.label}</button>
        ))}
      </div>

      {/* ── Aba: Atos ── */}
      {tab === 'atos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <FInput label="Busca" value={fBusca} onChange={e => setFBusca(e.target.value)} style={{ width: 220 }} placeholder="Controle ou L42P15" />
              <FSel label="Status" options={[{ value: '', label: 'Todos' }, { value: 'pendente', label: 'Pendente' }, { value: 'pago', label: 'Pago' }, { value: 'pago_menor', label: 'Pago a menor' }, { value: 'pago_maior', label: 'Pago a maior' }]} value={fStatus} onChange={e => setFStatus(e.target.value)} style={{ width: 160 }} />
              <FSel label="Captador" options={[{ value: '', label: 'Todos' }, ...escreventes.map(e => ({ value: e.id, label: e.nome }))]} value={fCaptador} onChange={e => setFCaptador(e.target.value)} style={{ width: 180 }} />
              <FInput label="Início" type="date" value={fInicio} onChange={e => setFInicio(e.target.value)} style={{ width: 145 }} />
              <FInput label="Fim"    type="date" value={fFim}    onChange={e => setFFim(e.target.value)}    style={{ width: 145 }} />
              <Btn variant="secondary" onClick={() => setShowColPanel(p => !p)} style={{ padding: '9px 14px', fontSize: 13 }}>⚙️ Colunas ({selectedCols.length})</Btn>
              <Btn onClick={handleExportAtos} style={{ padding: '9px 14px', fontSize: 13 }}>📥 Excel</Btn>
            </div>
            {showColPanel && (
              <div style={{ marginTop: 16, padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, color: '#1e3a5f', marginBottom: 10, fontSize: 13 }}>Selecionar colunas:</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                  {ALL_COLS.map(c => <label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}><input type="checkbox" checked={selectedCols.includes(c.key)} onChange={() => toggleCol(c.key)} style={{ width: 14, height: 14 }} />{c.label}</label>)}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <Btn variant="secondary" onClick={() => setSelectedCols(ALL_COLS.map(c => c.key))}                   style={{ fontSize: 12, padding: '6px 12px' }}>Todas</Btn>
                  <Btn variant="secondary" onClick={() => setSelectedCols(ALL_COLS.filter(c => c.def).map(c => c.key))} style={{ fontSize: 12, padding: '6px 12px' }}>Padrão</Btn>
                </div>
              </div>
            )}
          </Card>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {[
              { l: 'Atos',       v: atosFiltrados.length,                                                                    c: '#1e3a5f' },
              { l: 'Total',      v: fmt(atosFiltrados.reduce((s, a) => s + a.total, 0)),                                 c: '#1e3a5f' },
              { l: 'Recebido',   v: fmt(atosFiltrados.reduce((s, a) => s + a.valor_pago, 0)),                                c: '#22c55e' },
              { l: 'A receber',  v: fmt(atosFiltrados.reduce((s, a) => s + Math.max(0, a.total - a.valor_pago), 0)),     c: '#ef4444' },
            ].map((m, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', border: '1px solid #e8edf5' }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{m.l}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: m.c }}>{m.v}</div>
              </div>
            ))}
          </div>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr>{selectedCols.map(k => { const c = ALL_COLS.find(x => x.key === k); return <TH key={k} c={c?.label || k} />; })}</tr></thead>
                <tbody>
                  {atosFiltrados.map((a, i) => (
                    <tr key={a.id} style={{ borderTop: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                      {selectedCols.map(k => {
                        const c = ALL_COLS.find(x => x.key === k); const v = c ? c.get(a, escreventes) : '';
                        const saldo = a.total - a.valor_pago;
                        return (
                          <td key={k} style={{ padding: '10px 14px', whiteSpace: 'nowrap', fontWeight: ['total_recibo', 'valor_pago', 'emolumentos'].includes(k) ? 700 : 400, color: k === 'saldo' ? (saldo > 0 ? '#ef4444' : saldo < 0 ? '#3b82f6' : '#22c55e') : '#1e293b' }}>
                            {k === 'status' ? <Badge label={v} color={sColor(a.status)} /> : v}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {atosFiltrados.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Nenhum ato encontrado.</div>}
          </Card>
        </div>
      )}

      {/* ── Aba: Mensal ── */}
      {tab === 'mensal' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: '#1e3a5f', fontSize: 15 }}>📋 Faturamento do Mês</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <FInput label="Mês" type="month" value={mesFat} onChange={e => setMesFat(e.target.value)} style={{ width: 160 }} />
                <Btn onClick={() => exportXLSX(atosFat.map(a => ({ 'Controle': padControle(a.controle), 'Data': fmtDate(a.data_ato), 'Total': a.total, 'Emolumentos': a.emolumentos, 'Repasses': a.repasses, 'ISSQN': a.issqn, 'Remb.Tab': a.reembolso_tabeliao, 'Remb.Esc': a.reembolso_escrevente })), 'Faturamento', 'faturamento.xlsx')} style={{ fontSize: 13, padding: '9px 14px' }}>📥 Excel</Btn>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
              {[
                { l: 'Atos',               v: atosFat.length,                                                                                     c: '#1e3a5f' },
                { l: 'Total Faturado',      v: fmt(atosFat.reduce((s, a) => s + a.total, 0)),                                                  c: '#1e3a5f' },
                { l: 'Emolumentos',         v: fmt(atosFat.reduce((s, a) => s + a.emolumentos, 0)),                                                c: '#7c3aed' },
                { l: 'Repasses',            v: fmt(atosFat.reduce((s, a) => s + a.repasses, 0)),                                                   c: '#d97706' },
                { l: 'ISSQN',              v: fmt(atosFat.reduce((s, a) => s + a.issqn, 0)),                                                      c: '#0891b2' },
                { l: 'Remb. Tabelião',     v: fmt(atosFat.reduce((s, a) => s + a.reembolso_tabeliao, 0)),                                         c: '#16a34a' },
                { l: 'Remb. Escreventes',  v: fmt(atosFat.reduce((s, a) => s + a.reembolso_escrevente, 0)),                                       c: '#dc2626' },
                { l: 'Total Comissões',     v: fmt(atosFat.reduce((s, a) => s + (a.comissoes||[]).reduce((x, c) => x + c.total, 0), 0)), c: '#0891b2' },
              ].map((m, i) => (
                <div key={i} style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 16px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{m.l}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: m.c }}>{m.v}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: '#1e3a5f', fontSize: 15 }}>✅ Recebimentos do Mês</div>
              <FInput label="Mês" type="month" value={mesRec} onChange={e => setMesRec(e.target.value)} style={{ width: 160 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
              {[
                { l: 'Pagamentos',          v: atosRec.length,                                                                              c: '#1e3a5f' },
                { l: 'Total Recebido',      v: fmt(atosRec.reduce((s, a) => s + a.valor_pago, 0)),                                         c: '#16a34a' },
                { l: 'Emol. recebidos*',    v: fmt(atosRec.filter(a => a.status === 'pago').reduce((s, a) => s + a.emolumentos, 0)),        c: '#7c3aed' },
                { l: 'Repasses recebidos*', v: fmt(atosRec.filter(a => a.status === 'pago').reduce((s, a) => s + a.repasses, 0)),           c: '#d97706' },
              ].map((m, i) => (
                <div key={i} style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 16px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{m.l}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: m.c }}>{m.v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: '#94a3b8' }}>* Apenas atos pagos integralmente.</div>
            {atosRec.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontWeight: 600, color: '#1e3a5f', marginBottom: 8, fontSize: 13 }}>Por forma de pagamento:</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {FORMAS_PAGAMENTO.map(f => { const v = atosRec.filter(a => a.forma_pagamento === f).reduce((s, a) => s + a.valor_pago, 0); return v > 0 ? <div key={f} style={{ background: '#eff6ff', borderRadius: 8, padding: '8px 14px', fontSize: 13 }}><span style={{ fontWeight: 700, color: '#1e40af' }}>{f}:</span> {fmt(v)}</div> : null; })}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Aba: Comissões ── */}
      {tab === 'comissoes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <FInput label="Início" type="date" value={comInicio} onChange={e => setComInicio(e.target.value)} style={{ width: 155 }} />
              <FInput label="Fim"    type="date" value={comFim}    onChange={e => setComFim(e.target.value)}    style={{ width: 155 }} />
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Escreventes</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {escreventes.map(e => (
                    <label key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer', background: comEscIds.includes(e.id) ? '#dbeafe' : '#f1f5f9', borderRadius: 6, padding: '4px 8px', border: `1px solid ${comEscIds.includes(e.id) ? '#93c5fd' : '#e2e8f0'}` }}>
                      <input type="checkbox" checked={comEscIds.includes(e.id)} onChange={() => setComEscIds(prev => prev.includes(e.id) ? prev.filter(x => x !== e.id) : [...prev, e.id])} style={{ width: 12, height: 12 }} />
                      {e.nome.split(' ')[0]}
                    </label>
                  ))}
                </div>
              </div>
              <Btn onClick={() => exportXLSX(dadosCom.map(d => ({ 'Escrevente': d.nome, 'Taxa': d.taxa + '%', 'Atos': d.qtdAtos, 'Emolumentos': d.emolumentos, 'Total Comissões': d.comissoes, '% Comissão': parseFloat(d.pct.toFixed(2)) })), 'Comissões', 'comissoes.xlsx')} style={{ fontSize: 13, padding: '9px 14px' }}>📥 Excel</Btn>
            </div>
          </Card>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr style={{ background: '#f1f5f9' }}>{['Escrevente', 'Taxa', 'Atos Captados', 'Emolumentos', 'Total Comissões', '% sobre Emol.'].map(h => <TH key={h} c={h} />)}</tr></thead>
                <tbody>
                  {dadosCom.map((d, i) => (
                    <tr key={d.nome} style={{ borderTop: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                      <TD c={d.nome} bold /><TD c={d.taxa + '%'} /><TD c={d.qtdAtos} /><TD c={fmt(d.emolumentos)} bold /><TD c={fmt(d.comissoes)} bold />
                      <TD c={d.pct.toFixed(1) + '%'} color={d.pct > 25 ? '#ef4444' : d.pct > 15 ? '#f59e0b' : '#22c55e'} />
                    </tr>
                  ))}
                  {dadosCom.length > 0 && (
                    <tr style={{ borderTop: '2px solid #e2e8f0', background: '#f0f4ff' }}>
                      <td colSpan={3} style={{ padding: '10px 14px', fontWeight: 700, color: '#1e3a5f' }}>TOTAL</td>
                      <TD c={fmt(dadosCom.reduce((s, d) => s + d.emolumentos, 0))} bold />
                      <TD c={fmt(dadosCom.reduce((s, d) => s + d.comissoes, 0))} bold />
                      <TD c={(dadosCom.reduce((s, d) => s + d.emolumentos, 0) > 0 ? (dadosCom.reduce((s, d) => s + d.comissoes, 0) / dadosCom.reduce((s, d) => s + d.emolumentos, 0) * 100) : 0).toFixed(1) + '%'} bold />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {dadosCom.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Nenhum dado no período.</div>}
          </Card>
        </div>
      )}

      {/* ── Aba: Reembolsos ── */}
      {tab === 'reembolsos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {[
              { l: 'Remb. Tabelião lançado',            v: fmt(atos.reduce((s, a) => s + a.reembolso_tabeliao, 0)),            c: '#7c3aed' },
              { l: 'Remb. Escreventes lançado',          v: fmt(atos.reduce((s, a) => s + a.reembolso_escrevente, 0)),          c: '#0891b2' },
              { l: 'Remb. Esc. efetivamente devido',     v: fmt(atos.reduce((s, a) => s + a.reembolso_devido_escrevente, 0)),    c: '#16a34a' },
            ].map((m, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', border: '1px solid #e8edf5' }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{m.l}</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: m.c }}>{m.v}</div>
              </div>
            ))}
          </div>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: '#1e3a5f', fontSize: 15 }}>📑 Saldo por Escrevente</div>
              <Btn onClick={() => exportXLSX(dadosRembEsc.map(e => ({ 'Escrevente': e.nome, 'Devido': e.lancado, 'Pago': e.pago, 'Saldo': e.saldo })), 'Reembolsos', 'reembolsos.xlsx')} style={{ fontSize: 13, padding: '9px 14px' }}>📥 Excel</Btn>
            </div>
            {dadosRembEsc.length === 0
              ? <div style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>Nenhum reembolso lançado.</div>
              : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead><tr style={{ background: '#f1f5f9' }}>{['Escrevente', 'Devido ao escrevente', 'Pago pelo cartório', 'Saldo', ''].map(h => <TH key={h} c={h} />)}</tr></thead>
                    <tbody>
                      {dadosRembEsc.map((e, i) => (
                        <tr key={e.id} style={{ borderTop: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                          <TD c={e.nome} bold /><TD c={fmt(e.lancado)} /><TD c={fmt(e.pago)} color="#16a34a" bold /><TD c={fmt(e.saldo)} color={e.saldo > 0 ? '#ef4444' : '#22c55e'} bold />
                          <td style={{ padding: '10px 14px' }}><Btn variant="secondary" onClick={() => setModalReembolso(e)} style={{ fontSize: 12, padding: '5px 12px' }}>+ Registrar Pgto</Btn></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            }
          </Card>
          {pagamentosReembolso.length > 0 && (
            <Card>
              <div style={{ fontWeight: 700, color: '#1e3a5f', fontSize: 15, marginBottom: 14 }}>🕐 Histórico de Pagamentos</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr style={{ background: '#f1f5f9' }}>{['Data', 'Escrevente', 'Valor', 'Confirmado', 'Obs.'].map(h => <TH key={h} c={h} />)}</tr></thead>
                  <tbody>
                    {[...pagamentosReembolso].sort((a, b) => b.data.localeCompare(a.data)).map((p, i) => {
                      const e = escreventes.find(x => x.id === p.escrevente_id);
                      return (
                        <tr key={p.id} style={{ borderTop: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                          <TD c={fmtDate(p.data)} /><TD c={e?.nome || '—'} bold /><TD c={fmt(p.valor)} color="#16a34a" bold />
                          <td style={{ padding: '10px 14px' }}>
                            {p.confirmado_escrevente ? <Badge label="Confirmado" color="#22c55e" /> : <Badge label="Aguardando" color="#f59e0b" />}
                          </td>
                          <TD c={p.notas || '—'} />
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {modalReembolso && (
        <ModalPgtoReembolso
          escrevente={modalReembolso}
          onClose={() => setModalReembolso(null)}
          onSave={p => { onAddPagamento(p); setModalReembolso(null); }}
        />
      )}
    </div>
  );
}
