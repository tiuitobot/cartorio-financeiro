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
const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'pago', label: 'Pago' },
  { value: 'pago_menor', label: 'Pago a menor' },
  { value: 'pago_maior', label: 'Pago a maior' },
];
const CONFERENCIA_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'confirmado', label: 'Conferido' },
  { value: 'nao_confirmado', label: 'Não conferido' },
];

function FilterChip({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: active ? '1px solid #1d4ed8' : '1px solid #dbe4f0',
        background: active ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : '#fff',
        color: active ? '#fff' : '#475569',
        boxShadow: active ? '0 8px 18px #2563eb22' : 'none',
        borderRadius: 999,
        padding: '8px 14px',
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'all .15s ease',
      }}
    >
      {children}
    </button>
  );
}

function ActiveFilterTag({ label, onRemove }) {
  return (
    <button
      onClick={onRemove}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        border: '1px solid #bfdbfe',
        background: '#eff6ff',
        color: '#1d4ed8',
        borderRadius: 999,
        padding: '6px 10px',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      <span>{label}</span>
      <span style={{ fontSize: 11 }}>✕</span>
    </button>
  );
}

export default function Atos({
  atos, escreventes, reivindicacoes, userRole, userId,
  onOpenAto, onDeclaro, onRespostaCaptador, onContestar, onDecisaoFinanceiro,
  busca, onBusca, userStorageKey,
}) {
  const storageKey = `colunas_livros_${userStorageKey || 'anon'}`;
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showColPanel, setShowColPanel] = useState(false);
  const [fCaptador, setFCaptador] = useState('');
  const [fEnvolvido, setFEnvolvido] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fConfirmacao, setFConfirmacao] = useState('');
  const [fInicio, setFInicio] = useState('');
  const [fFim, setFFim] = useState('');
  const [fValorMin, setFValorMin] = useState('');
  const [fValorMax, setFValorMax] = useState('');
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
  const hasFiltrosAtivos = Boolean(
    busca || fCaptador || fEnvolvido || fStatus || fConfirmacao || fInicio || fFim || fValorMin || fValorMax
  );
  const captadorNome = escreventes.find((item) => item.id === Number.parseInt(fCaptador, 10))?.nome;
  const envolvidoNome = escreventes.find((item) => item.id === Number.parseInt(fEnvolvido, 10))?.nome;

  const atosListados = useMemo(() => {
    return atos.filter((ato) => {
      if (fCaptador && ato.captador_id !== Number.parseInt(fCaptador, 10)) return false;
      if (fEnvolvido) {
        const envolvidoId = Number.parseInt(fEnvolvido, 10);
        if (![ato.captador_id, ato.executor_id, ato.signatario_id].includes(envolvidoId)) return false;
      }
      if (fStatus && ato.status !== fStatus) return false;
      if (fConfirmacao === 'confirmado' && !ato.verificado_por) return false;
      if (fConfirmacao === 'nao_confirmado' && ato.verificado_por) return false;

      const dataAto = ato.data_ato?.slice(0, 10) || '';
      if (fInicio && (!dataAto || dataAto < fInicio)) return false;
      if (fFim && (!dataAto || dataAto > fFim)) return false;

      if (fValorMin && Number(ato.total || 0) < Number(fValorMin)) return false;
      if (fValorMax && Number(ato.total || 0) > Number(fValorMax)) return false;

      return true;
    });
  }, [atos, fCaptador, fEnvolvido, fStatus, fConfirmacao, fInicio, fFim, fValorMin, fValorMax]);

  const resetFiltros = () => {
    setFCaptador('');
    setFEnvolvido('');
    setFStatus('');
    setFConfirmacao('');
    setFInicio('');
    setFFim('');
    setFValorMin('');
    setFValorMax('');
    onBusca('');
  };

  const activeFilters = [
    busca ? { key: 'busca', label: `Busca: ${busca}`, onRemove: () => onBusca('') } : null,
    fStatus ? { key: 'status', label: `Status: ${STATUS_OPTIONS.find((item) => item.value === fStatus)?.label}`, onRemove: () => setFStatus('') } : null,
    fConfirmacao ? { key: 'confirmacao', label: `Conferência: ${CONFERENCIA_OPTIONS.find((item) => item.value === fConfirmacao)?.label}`, onRemove: () => setFConfirmacao('') } : null,
    fCaptador ? { key: 'captador', label: `Captador: ${captadorNome || fCaptador}`, onRemove: () => setFCaptador('') } : null,
    fEnvolvido ? { key: 'envolvido', label: `Envolvido: ${envolvidoNome || fEnvolvido}`, onRemove: () => setFEnvolvido('') } : null,
    fInicio ? { key: 'inicio', label: `De: ${fInicio}`, onRemove: () => setFInicio('') } : null,
    fFim ? { key: 'fim', label: `Até: ${fFim}`, onRemove: () => setFFim('') } : null,
    fValorMin ? { key: 'valor_min', label: `Mínimo: ${fmt(Number(fValorMin || 0))}`, onRemove: () => setFValorMin('') } : null,
    fValorMax ? { key: 'valor_max', label: `Máximo: ${fmt(Number(fValorMax || 0))}`, onRemove: () => setFValorMax('') } : null,
  ].filter(Boolean);

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

      <Card style={{ marginBottom: 18, padding: 20, background: 'linear-gradient(180deg,#ffffff,#f8fbff)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e3a5f', textTransform: 'uppercase', letterSpacing: 0.8 }}>Filtros e Colunas</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              Use filtros rápidos para operação diária e abra os filtros avançados só quando precisar.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Btn variant="secondary" onClick={() => setShowAdvancedFilters((value) => !value)} style={{ padding: '9px 12px', fontSize: 12 }}>
              {showAdvancedFilters ? 'Fechar filtros' : 'Mais filtros'}
            </Btn>
            <Btn variant="secondary" onClick={() => setShowColPanel((value) => !value)} style={{ padding: '9px 12px', fontSize: 12 }}>
              ⚙️ Colunas ({selectedCols.length})
            </Btn>
            {hasFiltrosAtivos && (
              <Btn variant="secondary" onClick={resetFiltros} style={{ padding: '9px 12px', fontSize: 12 }}>
                Limpar tudo
              </Btn>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(360px, 1.25fr) minmax(0, 1fr)', gap: 18, alignItems: 'start' }}>
          <div style={{ background: '#ffffff', border: '1px solid #dbe4f0', borderRadius: 18, padding: 16, boxShadow: 'inset 0 1px 0 #ffffff, 0 10px 24px #0f2a5508' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>Busca principal</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #dbe4f0', borderRadius: 14, padding: '10px 14px', background: '#f8fbff' }}>
              <span style={{ fontSize: 16, color: '#1d4ed8' }}>⌕</span>
              <input
                placeholder="Controle, L42P15 ou referência do ato..."
                value={busca}
                onChange={(e) => onBusca(e.target.value)}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: 14,
                  color: '#1e293b',
                }}
              />
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: '#64748b' }}>
              {atosListados.length} resultado(s) com os filtros atuais.
            </div>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ background: '#ffffff', border: '1px solid #dbe4f0', borderRadius: 18, padding: 14, boxShadow: 'inset 0 1px 0 #ffffff, 0 10px 24px #0f2a5508' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 }}>Status</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {STATUS_OPTIONS.map((option) => (
                  <FilterChip key={option.value || 'todos'} active={fStatus === option.value} onClick={() => setFStatus(option.value)}>
                    {option.label}
                  </FilterChip>
                ))}
              </div>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #dbe4f0', borderRadius: 18, padding: 14, boxShadow: 'inset 0 1px 0 #ffffff, 0 10px 24px #0f2a5508' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 }}>Conferência Financeira</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {CONFERENCIA_OPTIONS.map((option) => (
                  <FilterChip key={option.value || 'todas'} active={fConfirmacao === option.value} onClick={() => setFConfirmacao(option.value)}>
                    {option.label}
                  </FilterChip>
                ))}
              </div>
            </div>
          </div>
        </div>

        {activeFilters.length > 0 && (
          <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', paddingTop: 14, borderTop: '1px dashed #dbe4f0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.7 }}>Filtros ativos</div>
            {activeFilters.map((filter) => (
              <ActiveFilterTag key={filter.key} label={filter.label} onRemove={filter.onRemove} />
            ))}
          </div>
        )}

        {showAdvancedFilters && (
          <div style={{ marginTop: 18, borderTop: '1px solid #e8edf5', paddingTop: 18 }}>
            <div style={{ fontWeight: 700, color: '#1e3a5f', marginBottom: 12, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.6 }}>
              Filtros avançados
            </div>
            <div style={{ background: 'linear-gradient(180deg,#f8fbff,#ffffff)', border: '1px solid #dbe4f0', borderRadius: 18, padding: 16, boxShadow: 'inset 0 1px 0 #ffffff' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(180px, 1fr))', gap: 12 }}>
                <FSel
                  label="Captador"
                  options={[{ value: '', label: 'Todos' }, ...escreventes.map((e) => ({ value: e.id, label: e.nome }))]}
                  value={fCaptador}
                  onChange={(e) => setFCaptador(e.target.value)}
                />
                <FSel
                  label="Escrevente envolvido"
                  options={[{ value: '', label: 'Todos' }, ...escreventes.map((e) => ({ value: e.id, label: e.nome }))]}
                  value={fEnvolvido}
                  onChange={(e) => setFEnvolvido(e.target.value)}
                />
                <FInput label="Data inicial" type="date" value={fInicio} onChange={(e) => setFInicio(e.target.value)} />
                <FInput label="Data final" type="date" value={fFim} onChange={(e) => setFFim(e.target.value)} />
                <FInput label="Total mínimo" type="number" min="0" step="0.01" value={fValorMin} onChange={(e) => setFValorMin(e.target.value)} />
                <FInput label="Total máximo" type="number" min="0" step="0.01" value={fValorMax} onChange={(e) => setFValorMax(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {showColPanel && (
          <div style={{ marginTop: 18, borderTop: '1px solid #e8edf5', paddingTop: 18 }}>
            <div style={{ fontWeight: 700, color: '#1e3a5f', marginBottom: 10, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.6 }}>
              Selecionar colunas
            </div>
            <div style={{ background: 'linear-gradient(180deg,#f8fbff,#ffffff)', border: '1px solid #dbe4f0', borderRadius: 18, padding: 16, boxShadow: 'inset 0 1px 0 #ffffff' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                {TODAS_COLUNAS.map((coluna) => (
                  <label key={coluna.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', border: selectedCols.includes(coluna.key) ? '1px solid #93c5fd' : '1px solid #e2e8f0', borderRadius: 12, padding: '10px 12px', background: selectedCols.includes(coluna.key) ? '#eff6ff' : '#fff', color: selectedCols.includes(coluna.key) ? '#1d4ed8' : '#334155', fontWeight: selectedCols.includes(coluna.key) ? 700 : 500 }}>
                    <input type="checkbox" checked={selectedCols.includes(coluna.key)} onChange={() => toggleCol(coluna.key)} style={{ width: 14, height: 14 }} />
                    {coluna.label}
                  </label>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <Btn variant="secondary" onClick={() => setSelectedCols(TODAS_COLUNAS.map((coluna) => coluna.key))} style={{ fontSize: 12, padding: '6px 12px' }}>Todas</Btn>
                <Btn variant="secondary" onClick={() => setSelectedCols(COLUNAS_PADRAO)} style={{ fontSize: 12, padding: '6px 12px' }}>Padrão</Btn>
              </div>
            </div>
          </div> 
        )}
      </Card>

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
