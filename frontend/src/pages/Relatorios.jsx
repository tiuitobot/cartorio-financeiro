import { useMemo, useState } from 'react';
import { Card, FInput, FSel, Btn, Badge, StickyXScroll } from '../components/ui/index.jsx';
import { padControle, fmt, fmtDate, sColor, parseRef } from '../utils/format.js';
import { exportXLSX, ALL_COLS } from '../utils/export.js';
import { FORMAS_PAGAMENTO } from '../constants.js';
import ModalPgtoReembolso from '../components/modals/ModalPgtoReembolso.jsx';

const hoje = new Date();
const mesAtual = hoje.toISOString().slice(0, 7);
const anoInicio = `${hoje.getFullYear()}-01-01`;
const anoFim = `${hoje.getFullYear()}-12-31`;

const TH = ({ c }) => <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: 12, textTransform: 'uppercase', whiteSpace: 'nowrap', background: '#f1f5f9' }}>{c}</th>;
const TD = ({ c, bold, color }) => <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', fontWeight: bold ? 700 : 400, color: color || '#1e293b' }}>{c}</td>;

export default function Relatorios({
  atos,
  escreventes,
  pagamentosReembolso,
  onAddPagamento,
  onConfirmarReembolso,
  onContestarReembolso,
  userRole,
  userId,
}) {
  const [tab, setTab] = useState('atos');
  const [selectedCols, setSelectedCols] = useState(() => ALL_COLS.filter((item) => item.def).map((item) => item.key));
  const [showColPanel, setShowColPanel] = useState(false);
  const [fStatus, setFStatus] = useState('');
  const [fCaptador, setFCaptador] = useState('');
  const [fInicio, setFInicio] = useState('');
  const [fFim, setFFim] = useState('');
  const [fBusca, setFBusca] = useState('');
  const [mesFat, setMesFat] = useState(mesAtual);
  const [mesRec, setMesRec] = useState(mesAtual);
  const [comInicio, setComInicio] = useState(anoInicio);
  const [comFim, setComFim] = useState(anoFim);
  const [comEscIds, setComEscIds] = useState([]);
  const [modalReembolso, setModalReembolso] = useState(null);

  const tabs = [
    { key: 'atos', label: '📋 Atos' },
    { key: 'mensal', label: '📅 Mensal' },
    { key: 'comissoes', label: '📊 Comissões' },
    { key: 'reembolsos', label: '🔄 Reembolsos' },
  ];

  const atosFiltrados = useMemo(() => {
    let list = [...atos];
    if (fStatus) list = list.filter((ato) => ato.status === fStatus);
    if (fCaptador) list = list.filter((ato) => ato.captador_id === Number.parseInt(fCaptador, 10));
    if (fInicio) list = list.filter((ato) => ato.data_ato >= fInicio);
    if (fFim) list = list.filter((ato) => ato.data_ato <= fFim);
    if (fBusca) {
      const ref = parseRef(fBusca);
      if (ref) list = list.filter((ato) => Number.parseInt(ato.livro, 10) === ref.livro && Number.parseInt(ato.pagina, 10) === ref.pagina);
      else {
        const term = fBusca.toLowerCase();
        list = list.filter((ato) => padControle(ato.controle).includes(term) || ato.controle.includes(term));
      }
    }
    return list;
  }, [atos, fStatus, fCaptador, fInicio, fFim, fBusca]);

  const toggleCol = (key) => {
    setSelectedCols((prev) => (
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    ));
  };

  const handleExportAtos = () => {
    const rows = atosFiltrados.map((ato) => {
      const row = {};
      selectedCols.forEach((key) => {
        const col = ALL_COLS.find((item) => item.key === key);
        if (col) row[col.label] = col.raw(ato, escreventes);
      });
      return row;
    });
    exportXLSX(rows, 'Atos', 'relatorio_atos.xlsx');
  };

  const atosFat = useMemo(() => atos.filter((ato) => ato.data_ato?.startsWith(mesFat)), [atos, mesFat]);
  const atosRec = useMemo(() => atos.filter((ato) => ato.data_pagamento?.startsWith(mesRec)), [atos, mesRec]);

  const escFiltrados = comEscIds.length > 0 ? escreventes.filter((item) => comEscIds.includes(item.id)) : escreventes;
  const dadosCom = useMemo(() => escFiltrados.map((escrevente) => {
    const atosPeriodo = atos.filter((ato) => (!comInicio || ato.data_ato >= comInicio) && (!comFim || ato.data_ato <= comFim));
    const atosPraticados = atosPeriodo.filter((ato) => [ato.captador_id, ato.executor_id, ato.signatario_id].includes(escrevente.id));
    const totalEmolumentos = atosPraticados.reduce((sum, ato) => sum + ato.emolumentos, 0);
    const totalComissao = atosPeriodo.reduce((sum, ato) => {
      const item = (ato.comissoes || []).find((comissao) => comissao.escrevente_id === escrevente.id);
      return sum + (item ? item.total : 0);
    }, 0);

    return {
      nome: escrevente.nome,
      qtdAtos: atosPraticados.length,
      emolumentos: totalEmolumentos,
      comissoes: totalComissao,
    };
  }).filter((item) => item.qtdAtos > 0 || item.comissoes > 0), [atos, escFiltrados, comInicio, comFim]);

  const dadosRembEsc = escreventes.map((escrevente) => {
    const lancado = atos.filter((ato) => ato.escrevente_reembolso_id === escrevente.id).reduce((sum, ato) => sum + ato.reembolso_devido_escrevente, 0);
    const pago = pagamentosReembolso.filter((pagamento) => pagamento.escrevente_id === escrevente.id).reduce((sum, pagamento) => sum + pagamento.valor, 0);
    return { ...escrevente, lancado, pago, saldo: lancado - pago };
  }).filter((item) => item.lancado > 0 || item.pago > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 12, padding: 4 }}>
        {tabs.map((item) => (
          <button key={item.key} onClick={() => setTab(item.key)} style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 9, background: tab === item.key ? '#fff' : 'transparent', color: tab === item.key ? '#1e3a5f' : '#64748b', fontWeight: tab === item.key ? 700 : 500, fontSize: 13, cursor: 'pointer', boxShadow: tab === item.key ? '0 1px 4px #0f2a5520' : 'none' }}>{item.label}</button>
        ))}
      </div>

      {tab === 'atos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <FInput label="Busca" value={fBusca} onChange={(e) => setFBusca(e.target.value)} style={{ width: 220 }} placeholder="Controle ou L42P15" />
              <FSel label="Status" options={[{ value: '', label: 'Todos' }, { value: 'pendente', label: 'Pendente' }, { value: 'pago', label: 'Pago' }, { value: 'pago_menor', label: 'Pago a menor' }, { value: 'pago_maior', label: 'Pago a maior' }]} value={fStatus} onChange={(e) => setFStatus(e.target.value)} style={{ width: 160 }} />
              <FSel label="Captador" options={[{ value: '', label: 'Todos' }, ...escreventes.map((item) => ({ value: item.id, label: item.nome }))]} value={fCaptador} onChange={(e) => setFCaptador(e.target.value)} style={{ width: 180 }} />
              <FInput label="Início" type="date" value={fInicio} onChange={(e) => setFInicio(e.target.value)} style={{ width: 145 }} />
              <FInput label="Fim" type="date" value={fFim} onChange={(e) => setFFim(e.target.value)} style={{ width: 145 }} />
              <Btn variant="secondary" onClick={() => setShowColPanel((value) => !value)} style={{ padding: '9px 14px', fontSize: 13 }}>⚙️ Colunas ({selectedCols.length})</Btn>
              <Btn onClick={handleExportAtos} style={{ padding: '9px 14px', fontSize: 13 }}>📥 Excel</Btn>
            </div>
            {showColPanel && (
              <div style={{ marginTop: 16, padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 700, color: '#1e3a5f', marginBottom: 10, fontSize: 13 }}>Selecionar colunas:</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                  {ALL_COLS.map((coluna) => (
                    <label key={coluna.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                      <input type="checkbox" checked={selectedCols.includes(coluna.key)} onChange={() => toggleCol(coluna.key)} style={{ width: 14, height: 14 }} />
                      {coluna.label}
                    </label>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <Btn variant="secondary" onClick={() => setSelectedCols(ALL_COLS.map((coluna) => coluna.key))} style={{ fontSize: 12, padding: '6px 12px' }}>Todas</Btn>
                  <Btn variant="secondary" onClick={() => setSelectedCols(ALL_COLS.filter((coluna) => coluna.def).map((coluna) => coluna.key))} style={{ fontSize: 12, padding: '6px 12px' }}>Padrão</Btn>
                </div>
              </div>
            )}
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {[
              { l: 'Atos', v: atosFiltrados.length, c: '#1e3a5f' },
              { l: 'Total', v: fmt(atosFiltrados.reduce((sum, ato) => sum + ato.total, 0)), c: '#1e3a5f' },
              { l: 'Recebido', v: fmt(atosFiltrados.reduce((sum, ato) => sum + ato.valor_pago, 0)), c: '#22c55e' },
              { l: 'A receber', v: fmt(atosFiltrados.reduce((sum, ato) => sum + Math.max(0, ato.total - ato.valor_pago), 0)), c: '#ef4444' },
            ].map((metric, index) => (
              <div key={index} style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', border: '1px solid #e8edf5' }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{metric.l}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: metric.c }}>{metric.v}</div>
              </div>
            ))}
          </div>

          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <StickyXScroll>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 1000 }}>
                <thead><tr>{selectedCols.map((key) => { const col = ALL_COLS.find((item) => item.key === key); return <TH key={key} c={col?.label || key} />; })}</tr></thead>
                <tbody>
                  {atosFiltrados.map((ato, index) => (
                    <tr key={ato.id} style={{ borderTop: '1px solid #f1f5f9', background: index % 2 === 0 ? '#fff' : '#fafbfc' }}>
                      {selectedCols.map((key) => {
                        const col = ALL_COLS.find((item) => item.key === key);
                        const value = col ? col.get(ato, escreventes) : '';
                        const saldo = ato.total - ato.valor_pago;
                        return (
                          <td key={key} style={{ padding: '10px 14px', whiteSpace: 'nowrap', fontWeight: ['total_recibo', 'valor_pago', 'emolumentos'].includes(key) ? 700 : 400, color: key === 'saldo' ? (saldo > 0 ? '#ef4444' : saldo < 0 ? '#3b82f6' : '#22c55e') : '#1e293b' }}>
                            {key === 'status' ? <Badge label={value} color={sColor(ato.status)} /> : value}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </StickyXScroll>
            {atosFiltrados.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Nenhum ato encontrado.</div>}
          </Card>
        </div>
      )}

      {tab === 'mensal' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: '#1e3a5f', fontSize: 15 }}>📋 Faturamento do Mês</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <FInput label="Mês" type="month" value={mesFat} onChange={(e) => setMesFat(e.target.value)} style={{ width: 160 }} />
                <Btn onClick={() => exportXLSX(atosFat.map((ato) => ({ Controle: padControle(ato.controle), Data: fmtDate(ato.data_ato), Total: ato.total, Emolumentos: ato.emolumentos, Repasses: ato.repasses, ISSQN: ato.issqn, 'Remb.Tab': ato.reembolso_tabeliao, 'Remb.Esc': ato.reembolso_escrevente })), 'Faturamento', 'faturamento.xlsx')} style={{ fontSize: 13, padding: '9px 14px' }}>📥 Excel</Btn>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
              {[
                { l: 'Atos', v: atosFat.length, c: '#1e3a5f' },
                { l: 'Total Faturado', v: fmt(atosFat.reduce((sum, ato) => sum + ato.total, 0)), c: '#1e3a5f' },
                { l: 'Emolumentos', v: fmt(atosFat.reduce((sum, ato) => sum + ato.emolumentos, 0)), c: '#7c3aed' },
                { l: 'Repasses', v: fmt(atosFat.reduce((sum, ato) => sum + ato.repasses, 0)), c: '#d97706' },
                { l: 'ISSQN', v: fmt(atosFat.reduce((sum, ato) => sum + ato.issqn, 0)), c: '#0891b2' },
                { l: 'Remb. Tabelião', v: fmt(atosFat.reduce((sum, ato) => sum + ato.reembolso_tabeliao, 0)), c: '#16a34a' },
                { l: 'Remb. Escreventes', v: fmt(atosFat.reduce((sum, ato) => sum + ato.reembolso_escrevente, 0)), c: '#dc2626' },
                { l: 'Total Comissões', v: fmt(atosFat.reduce((sum, ato) => sum + (ato.comissoes || []).reduce((acc, item) => acc + item.total, 0), 0)), c: '#0891b2' },
              ].map((metric, index) => (
                <div key={index} style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 16px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{metric.l}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: metric.c }}>{metric.v}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: '#1e3a5f', fontSize: 15 }}>✅ Recebimentos do Mês</div>
              <FInput label="Mês" type="month" value={mesRec} onChange={(e) => setMesRec(e.target.value)} style={{ width: 160 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
              {[
                { l: 'Pagamentos', v: atosRec.length, c: '#1e3a5f' },
                { l: 'Total Recebido', v: fmt(atosRec.reduce((sum, ato) => sum + ato.valor_pago, 0)), c: '#16a34a' },
                { l: 'Emol. recebidos*', v: fmt(atosRec.filter((ato) => ato.status === 'pago').reduce((sum, ato) => sum + ato.emolumentos, 0)), c: '#7c3aed' },
                { l: 'Repasses recebidos*', v: fmt(atosRec.filter((ato) => ato.status === 'pago').reduce((sum, ato) => sum + ato.repasses, 0)), c: '#d97706' },
              ].map((metric, index) => (
                <div key={index} style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 16px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{metric.l}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: metric.c }}>{metric.v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: '#94a3b8' }}>* Apenas atos pagos integralmente.</div>
            {atosRec.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontWeight: 600, color: '#1e3a5f', marginBottom: 8, fontSize: 13 }}>Por forma de pagamento:</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {FORMAS_PAGAMENTO.map((forma) => {
                    const valor = atosRec.filter((ato) => ato.forma_pagamento === forma).reduce((sum, ato) => sum + ato.valor_pago, 0);
                    return valor > 0 ? <div key={forma} style={{ background: '#eff6ff', borderRadius: 8, padding: '8px 14px', fontSize: 13 }}><span style={{ fontWeight: 700, color: '#1e40af' }}>{forma}:</span> {fmt(valor)}</div> : null;
                  })}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'comissoes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <FInput label="Início" type="date" value={comInicio} onChange={(e) => setComInicio(e.target.value)} style={{ width: 155 }} />
              <FInput label="Fim" type="date" value={comFim} onChange={(e) => setComFim(e.target.value)} style={{ width: 155 }} />
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Escreventes</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {escreventes.map((item) => (
                    <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer', background: comEscIds.includes(item.id) ? '#dbeafe' : '#f1f5f9', borderRadius: 6, padding: '4px 8px', border: `1px solid ${comEscIds.includes(item.id) ? '#93c5fd' : '#e2e8f0'}` }}>
                      <input type="checkbox" checked={comEscIds.includes(item.id)} onChange={() => setComEscIds((prev) => prev.includes(item.id) ? prev.filter((value) => value !== item.id) : [...prev, item.id])} style={{ width: 12, height: 12 }} />
                      {item.nome.split(' ')[0]}
                    </label>
                  ))}
                </div>
              </div>
              <Btn onClick={() => exportXLSX(dadosCom.map((item) => ({ Escrevente: item.nome, 'Atos Praticados': item.qtdAtos, 'Total Emolumentos': item.emolumentos, 'Total Comissões': item.comissoes })), 'Comissões', 'comissoes.xlsx')} style={{ fontSize: 13, padding: '9px 14px' }}>📥 Excel</Btn>
            </div>
          </Card>

          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <StickyXScroll>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 820 }}>
                <thead><tr style={{ background: '#f1f5f9' }}>{['Escrevente', 'Atos Praticados', 'Total Emolumentos', 'Total Comissão'].map((header) => <TH key={header} c={header} />)}</tr></thead>
                <tbody>
                  {dadosCom.map((item, index) => (
                    <tr key={item.nome} style={{ borderTop: '1px solid #f1f5f9', background: index % 2 === 0 ? '#fff' : '#fafbfc' }}>
                      <TD c={item.nome} bold />
                      <TD c={item.qtdAtos} />
                      <TD c={fmt(item.emolumentos)} bold />
                      <TD c={fmt(item.comissoes)} bold />
                    </tr>
                  ))}
                  {dadosCom.length > 0 && (
                    <tr style={{ borderTop: '2px solid #e2e8f0', background: '#f0f4ff' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#1e3a5f' }}>TOTAL</td>
                      <TD c={dadosCom.reduce((sum, item) => sum + item.qtdAtos, 0)} bold />
                      <TD c={fmt(dadosCom.reduce((sum, item) => sum + item.emolumentos, 0))} bold />
                      <TD c={fmt(dadosCom.reduce((sum, item) => sum + item.comissoes, 0))} bold />
                    </tr>
                  )}
                </tbody>
              </table>
            </StickyXScroll>
            {dadosCom.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Nenhum dado no período.</div>}
          </Card>
        </div>
      )}

      {tab === 'reembolsos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {[
              { l: 'Remb. Tabelião lançado', v: fmt(atos.reduce((sum, ato) => sum + ato.reembolso_tabeliao, 0)), c: '#7c3aed' },
              { l: 'Remb. Escreventes lançado', v: fmt(atos.reduce((sum, ato) => sum + ato.reembolso_escrevente, 0)), c: '#0891b2' },
              { l: 'Remb. Esc. efetivamente devido', v: fmt(atos.reduce((sum, ato) => sum + ato.reembolso_devido_escrevente, 0)), c: '#16a34a' },
            ].map((metric, index) => (
              <div key={index} style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', border: '1px solid #e8edf5' }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{metric.l}</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: metric.c }}>{metric.v}</div>
              </div>
            ))}
          </div>

          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: '#1e3a5f', fontSize: 15 }}>📑 Saldo por Escrevente</div>
              <Btn onClick={() => exportXLSX(dadosRembEsc.map((item) => ({ Escrevente: item.nome, Devido: item.lancado, Pago: item.pago, Saldo: item.saldo })), 'Reembolsos', 'reembolsos.xlsx')} style={{ fontSize: 13, padding: '9px 14px' }}>📥 Excel</Btn>
            </div>
            {dadosRembEsc.length === 0
              ? <div style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>Nenhum reembolso lançado.</div>
              : (
                <StickyXScroll>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 840 }}>
                    <thead><tr style={{ background: '#f1f5f9' }}>{['Escrevente', 'Devido ao escrevente', 'Pago pelo cartório', 'Saldo', ''].map((header) => <TH key={header} c={header} />)}</tr></thead>
                    <tbody>
                      {dadosRembEsc.map((item, index) => (
                        <tr key={item.id} style={{ borderTop: '1px solid #f1f5f9', background: index % 2 === 0 ? '#fff' : '#fafbfc' }}>
                          <TD c={item.nome} bold />
                          <TD c={fmt(item.lancado)} />
                          <TD c={fmt(item.pago)} color="#16a34a" bold />
                          <TD c={fmt(item.saldo)} color={item.saldo > 0 ? '#ef4444' : '#22c55e'} bold />
                          <td style={{ padding: '10px 14px' }}><Btn variant="secondary" onClick={() => setModalReembolso(item)} style={{ fontSize: 12, padding: '5px 12px' }}>+ Registrar Pgto</Btn></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </StickyXScroll>
              )}
          </Card>

          {pagamentosReembolso.length > 0 && (
            <Card>
              <div style={{ fontWeight: 700, color: '#1e3a5f', fontSize: 15, marginBottom: 14 }}>🕐 Histórico de Pagamentos</div>
              <StickyXScroll>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 980 }}>
                  <thead><tr style={{ background: '#f1f5f9' }}>{['Data', 'Escrevente', 'Valor', 'Status', 'Ações', 'Obs.'].map((header) => <TH key={header} c={header} />)}</tr></thead>
                  <tbody>
                    {[...pagamentosReembolso].sort((a, b) => b.data.localeCompare(a.data)).map((pagamento, index) => {
                      const escrevente = escreventes.find((item) => item.id === pagamento.escrevente_id);
                      const isOwner = userRole === 'escrevente' && userId === pagamento.escrevente_id;
                      const badge = pagamento.contestado_escrevente
                        ? <Badge label="Contestado" color="#ef4444" />
                        : pagamento.confirmado_escrevente
                          ? <Badge label="Confirmado" color="#22c55e" />
                          : <Badge label="Aguardando" color="#f59e0b" />;
                      return (
                        <tr key={pagamento.id} style={{ borderTop: '1px solid #f1f5f9', background: index % 2 === 0 ? '#fff' : '#fafbfc' }}>
                          <TD c={fmtDate(pagamento.data)} />
                          <TD c={escrevente?.nome || '—'} bold />
                          <TD c={fmt(pagamento.valor)} color="#16a34a" bold />
                          <td style={{ padding: '10px 14px' }}>{badge}</td>
                          <td style={{ padding: '10px 14px' }}>
                            {isOwner && !pagamento.confirmado_escrevente && !pagamento.contestado_escrevente && (
                              <div style={{ display: 'flex', gap: 8 }}>
                                <Btn variant="success" onClick={() => onConfirmarReembolso(pagamento.id)} style={{ fontSize: 12, padding: '5px 12px' }}>Confirmar</Btn>
                                <Btn
                                  variant="danger"
                                  onClick={() => {
                                    const justificativa = window.prompt('Justifique por que você não reconhece este pagamento.');
                                    if (!justificativa) return;
                                    onContestarReembolso?.(pagamento.id, justificativa);
                                  }}
                                  style={{ fontSize: 12, padding: '5px 12px' }}
                                >
                                  Não reconheço
                                </Btn>
                              </div>
                            )}
                          </td>
                          <TD c={pagamento.contestacao_justificativa || pagamento.notas || '—'} />
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </StickyXScroll>
            </Card>
          )}
        </div>
      )}

      {modalReembolso && (
        <ModalPgtoReembolso
          escrevente={modalReembolso}
          onClose={() => setModalReembolso(null)}
          onSave={(payload) => { onAddPagamento(payload); setModalReembolso(null); }}
        />
      )}
    </div>
  );
}
