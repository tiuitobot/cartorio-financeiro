import { useEffect, useMemo, useState } from 'react';
import { Card, Btn, FInput, FSel, Badge, StickyXScroll } from '../components/ui/index.jsx';
import { padControle, fmtRef, fmtDate, fmt, sLabel, sColor } from '../utils/format.js';

const COLUNAS_PADRAO = ['controle', 'referencia', 'data', 'captador', 'emolumentos', 'total', 'pago', 'status'];
const TODAS_COLUNAS = [
  { key: 'controle', label: 'Controle' },
  { key: 'referencia', label: 'Referência' },
  { key: 'data', label: 'Data' },
  { key: 'tipo_ato', label: 'Tipo de Ato' },
  { key: 'captador', label: 'Captador' },
  { key: 'executor', label: 'Executor' },
  { key: 'signatario', label: 'Signatário' },
  { key: 'tomador', label: 'Tomador' },
  { key: 'emolumentos', label: 'Emolumentos' },
  { key: 'total', label: 'Total' },
  { key: 'pago', label: 'Pago' },
  { key: 'status', label: 'Status' },
];

export default function Atos({
  atos, escreventes, reivindicacoes, userRole, userId,
  onOpenAto, onDeclaro, onRespostaCaptador, onContestar, onDecisaoFinanceiro,
  busca, onBusca, userStorageKey,
}) {
  const storageKey = `colunas_livros_${userStorageKey || 'anon'}`;
  const [showColPanel, setShowColPanel] = useState(false);
  const [fEnvolvido, setFEnvolvido] = useState('');
  const [selectedCols, setSelectedCols] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || 'null');
      return Array.isArray(stored) && stored.length ? stored : COLUNAS_PADRAO;
    } catch {
      return COLUNAS_PADRAO;
    }
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(selectedCols));
  }, [selectedCols, storageKey]);

  const toggleCol = (key) => {
    setSelectedCols((prev) => (
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    ));
  };

  const reivRecusadas   = reivindicacoes.filter(r => r.escrevente_id === userId && r.status === 'recusada');
  const reivPendentes   = reivindicacoes.filter(r => r.status === 'pendente' && atos.find(a => a.id === r.ato_id && a.captador_id === userId));
  const reivContestadas = reivindicacoes.filter(r => r.status === 'contestada');

  const atosListados = useMemo(() => {
    if (!fEnvolvido) return atos;
    const eid = Number.parseInt(fEnvolvido, 10);
    return atos.filter((ato) => [ato.captador_id, ato.executor_id, ato.signatario_id].includes(eid));
  }, [atos, fEnvolvido]);

  const renderCell = (ato, key) => {
    const capt = escreventes.find((item) => item.id === ato.captador_id);
    const executor = escreventes.find((item) => item.id === ato.executor_id);
    const signatario = escreventes.find((item) => item.id === ato.signatario_id);
    const tot = ato.total;

    const map = {
      controle: <span style={{ fontWeight: 700, color: '#1e3a5f', whiteSpace: 'nowrap' }}>{padControle(ato.controle)}</span>,
      referencia: <span style={{ color: '#64748b', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 12 }}>{fmtRef(ato.livro, ato.pagina)}</span>,
      data: <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{fmtDate(ato.data_ato)}</span>,
      tipo_ato: ato.tipo_ato || <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>,
      captador: capt?.nome || <span style={{ color: '#94a3b8', fontSize: 12 }}>Sem captador</span>,
      executor: executor?.nome || '—',
      signatario: signatario?.nome || '—',
      tomador: ato.nome_tomador || '—',
      emolumentos: <span style={{ whiteSpace: 'nowrap' }}>{fmt(ato.emolumentos)}</span>,
      total: <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{fmt(tot)}</span>,
      pago: <span style={{ color: ato.valor_pago >= tot ? '#22c55e' : '#ef4444', fontWeight: 700, whiteSpace: 'nowrap' }}>{fmt(ato.valor_pago)}</span>,
      status: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Badge label={sLabel(ato.status)} color={sColor(ato.status)} />
          {ato.verificado_por && <span title={`Confirmado por ${ato.verificado_por}`} style={{ fontSize: 14 }}>✅</span>}
        </div>
      ),
    };

    return map[key] ?? '—';
  };

  return (
    <div>
      {userRole === 'escrevente' && reivRecusadas.length > 0 && (
        <Card style={{ marginBottom: 18, borderLeft: '4px solid #ef4444', background: '#fef2f2' }}>
          <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: 10 }}>⚠️ Reivindicação Recusada pelo Captador</div>
          {reivRecusadas.map(r => {
            const ato = atos.find(a => a.id === r.ato_id);
            return (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#fff', borderRadius: 10, border: '1px solid #fecaca', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>Ato {padControle(ato?.controle || '')} — {r.funcao === 'executor' ? 'Executor' : 'Signatário'}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>Justificativa: <em>{r.justificativa}</em></div>
                </div>
                <Btn variant="warning" onClick={() => onContestar(r.id)} style={{ fontSize: 12, padding: '6px 14px', whiteSpace: 'nowrap' }}>Contestar</Btn>
              </div>
            );
          })}
        </Card>
      )}

      {userRole === 'escrevente' && reivPendentes.length > 0 && (
        <Card style={{ marginBottom: 18, borderLeft: '4px solid #f59e0b', background: '#fffbeb' }}>
          <div style={{ fontWeight: 700, color: '#92400e', marginBottom: 10 }}>🔔 Reivindicações Aguardando Sua Resposta</div>
          {reivPendentes.map(r => {
            const ato = atos.find(a => a.id === r.ato_id);
            return (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#fff', borderRadius: 10, border: '1px solid #fde68a', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{r.escrevente_nome} — {r.funcao === 'executor' ? 'Executor' : 'Signatário'}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Ato {padControle(ato?.controle || '')} — {fmtRef(ato?.livro, ato?.pagina)}</div>
                </div>
                <Btn variant="warning" onClick={() => onRespostaCaptador(r)} style={{ fontSize: 12, padding: '6px 14px', whiteSpace: 'nowrap' }}>Responder</Btn>
              </div>
            );
          })}
        </Card>
      )}

      {['financeiro', 'chefe_financeiro', 'admin'].includes(userRole) && reivContestadas.length > 0 && (
        <Card style={{ marginBottom: 18, borderLeft: '4px solid #3b82f6', background: '#eff6ff' }}>
          <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: 10 }}>⚖️ Contestações Aguardando Decisão ({reivContestadas.length})</div>
          {reivContestadas.map(r => {
            const ato = atos.find(a => a.id === r.ato_id);
            const captador = escreventes.find(e => e.id === ato?.captador_id);
            return (
              <div key={r.id} style={{ padding: '12px 14px', background: '#fff', borderRadius: 10, border: '1px solid #bfdbfe', marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{r.escrevente_nome} — {r.funcao === 'executor' ? 'Executor' : 'Signatário'} | Ato {padControle(ato?.controle || '')} | Captador: {captador?.nome || '—'}</div>
                <div style={{ fontSize: 12, color: '#ef4444', margin: '4px 0 10px' }}>Recusa: <em>{r.justificativa}</em></div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Btn variant="success" onClick={() => onDecisaoFinanceiro(r.id, true)} style={{ fontSize: 12, padding: '6px 14px' }}>✅ Aceitar</Btn>
                  <Btn variant="danger" onClick={() => onDecisaoFinanceiro(r.id, false)} style={{ fontSize: 12, padding: '6px 14px' }}>❌ Negar</Btn>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      <div style={{ marginBottom: 18, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <FInput placeholder="Controle ou L42P15..." value={busca} onChange={e => onBusca(e.target.value)} style={{ width: 280 }} />
        <FSel
          label="Escrevente envolvido"
          options={[{ value: '', label: 'Todos' }, ...escreventes.map((e) => ({ value: e.id, label: e.nome }))]}
          value={fEnvolvido}
          onChange={(e) => setFEnvolvido(e.target.value)}
          style={{ width: 220 }}
        />
        <Btn variant="secondary" onClick={() => setShowColPanel((value) => !value)} style={{ padding: '9px 12px', fontSize: 12 }}>⚙️ Colunas ({selectedCols.length})</Btn>
        {busca && <Btn variant="secondary" onClick={() => onBusca('')} style={{ padding: '9px 12px', fontSize: 12 }}>✕</Btn>}
      </div>

      {showColPanel && (
        <Card style={{ marginBottom: 18, padding: 16 }}>
          <div style={{ fontWeight: 700, color: '#1e3a5f', marginBottom: 10, fontSize: 13 }}>Selecionar colunas</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
            {TODAS_COLUNAS.map((coluna) => (
              <label key={coluna.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={selectedCols.includes(coluna.key)} onChange={() => toggleCol(coluna.key)} style={{ width: 14, height: 14 }} />
                {coluna.label}
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <Btn variant="secondary" onClick={() => setSelectedCols(TODAS_COLUNAS.map((coluna) => coluna.key))} style={{ fontSize: 12, padding: '6px 12px' }}>Todas</Btn>
            <Btn variant="secondary" onClick={() => setSelectedCols(COLUNAS_PADRAO)} style={{ fontSize: 12, padding: '6px 12px' }}>Padrão</Btn>
          </div>
        </Card>
      )}

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <StickyXScroll>
          <table style={{ width: '100%', minWidth: 1100, borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                {selectedCols.map((key) => {
                  const coluna = TODAS_COLUNAS.find((item) => item.key === key);
                  return (
                    <th key={key} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: 12, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      {coluna?.label || key}
                    </th>
                  );
                })}
                <th style={{ padding: '12px 14px' }} />
              </tr>
            </thead>
            <tbody>
              {atosListados.map((a, i) => (
                <tr key={a.id} style={{ borderTop: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}
                  onMouseOver={ev => ev.currentTarget.style.background = '#f0f7ff'}
                  onMouseOut={ev => ev.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafbfc'}>
                  {selectedCols.map((key) => (
                    <td key={key} style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                      {renderCell(a, key)}
                    </td>
                  ))}
                  <td style={{ padding: '11px 14px' }}>
                    <Btn variant="secondary" onClick={() => onOpenAto(a)} style={{ padding: '5px 14px', fontSize: 12, whiteSpace: 'nowrap' }}>🔍 Ver/Editar</Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </StickyXScroll>
        {atosListados.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Nenhum ato encontrado.</div>}
      </Card>
    </div>
  );
}
