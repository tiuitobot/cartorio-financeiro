import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, Btn, FInput, FSel, Badge, StickyXScroll, FilterChip, ActiveFilterTag, Sheet } from '../components/ui/index.jsx';
import { usePagination, Pagination } from '../components/ui/Pagination.jsx';
import { padControle, fmtRef, fmtDate, fmt, sLabel, sColor } from '../utils/format.js';
import { areStringArraysEqual, normalizeColumnSelection, readColumnSelectionFromStorage } from '../utils/column-preferences.js';

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
  { key: 'pago', label: 'Financeiro' },
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
  { value: 'pendente', label: 'Pendente de conferência' },
  { value: 'sem_pagamento', label: 'Sem pagamento lançado' },
];

export default function Atos({
  atos, escreventes, userRole, userId,
  onOpenAto,
  busca, onBusca, userStorageKey, preferredColumns, onSavePreferredColumns,
}) {
  const storageKey = `colunas_livros_${userStorageKey || 'anon'}`;
  const paginationKey = `pagination_atos_${userStorageKey || 'anon'}`;
  const allowedColumnKeys = useMemo(
    () => TODAS_COLUNAS.map((coluna) => coluna.key),
    []
  );
  const preferredColumnsKey = Array.isArray(preferredColumns) ? preferredColumns.join('|') : '__none__';
  const normalizedPreferredColumns = useMemo(
    () => normalizeColumnSelection(preferredColumns, allowedColumnKeys),
    [preferredColumnsKey, allowedColumnKeys]
  );
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
  const [selectedCols, setSelectedCols] = useState(() => (
    normalizedPreferredColumns
    ?? readColumnSelectionFromStorage(storageKey, allowedColumnKeys)
    ?? COLUNAS_PADRAO
  ));
  const lastPersistedColsRef = useRef(normalizedPreferredColumns);

  useEffect(() => {
    if (normalizedPreferredColumns === null) return;
    lastPersistedColsRef.current = normalizedPreferredColumns;
    setSelectedCols((prev) => (
      areStringArraysEqual(prev, normalizedPreferredColumns) ? prev : normalizedPreferredColumns
    ));
  }, [normalizedPreferredColumns]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(selectedCols));
  }, [selectedCols, storageKey]);

  useEffect(() => {
    if (!onSavePreferredColumns) return undefined;
    if (lastPersistedColsRef.current && areStringArraysEqual(selectedCols, lastPersistedColsRef.current)) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      const nextSelection = [...selectedCols];
      onSavePreferredColumns(nextSelection)
        .then(() => {
          lastPersistedColsRef.current = nextSelection;
        })
        .catch(() => {});
    }, 250);

    return () => window.clearTimeout(timer);
  }, [selectedCols, onSavePreferredColumns]);

  const toggleCol = (key) => {
    setSelectedCols((prev) => (
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    ));
  };

  const podeConferirFinanceiro = ['admin', 'financeiro', 'chefe_financeiro'].includes(userRole);
  const hasFiltrosAtivos = Boolean(
    busca || fCaptador || fEnvolvido || fStatus || fConfirmacao || fInicio || fFim || fValorMin || fValorMax
  );
  const captadorNome = escreventes.find((item) => item.id === Number.parseInt(fCaptador, 10))?.nome;
  const envolvidoNome = escreventes.find((item) => item.id === Number.parseInt(fEnvolvido, 10))?.nome;
  const advancedFilterCount = [fCaptador, fEnvolvido, fInicio, fFim, fValorMin, fValorMax].filter(Boolean).length;

  const atosListados = useMemo(() => {
    return atos.filter((ato) => {
      const pagamentosLancados = Number(ato.pagamentos_lancados || 0);
      const temLancamentoFinanceiro =
        pagamentosLancados > 0
        || Number(ato.valor_pago_lancado || ato.valor_pago || 0) > 0;
      const conferenciaConcluida = Boolean(ato.verificado_por);

      if (fCaptador && ato.captador_id !== Number.parseInt(fCaptador, 10)) return false;
      if (fEnvolvido) {
        const envolvidoId = Number.parseInt(fEnvolvido, 10);
        if (![ato.captador_id, ato.executor_id, ato.signatario_id].includes(envolvidoId)) return false;
      }
      if (fStatus && ato.status !== fStatus) return false;
      if (fConfirmacao === 'confirmado' && !conferenciaConcluida) return false;
      if (fConfirmacao === 'pendente' && (!temLancamentoFinanceiro || conferenciaConcluida)) return false;
      if (fConfirmacao === 'sem_pagamento' && temLancamentoFinanceiro) return false;

      const dataAto = ato.data_ato?.slice(0, 10) || '';
      if (fInicio && (!dataAto || dataAto < fInicio)) return false;
      if (fFim && (!dataAto || dataAto > fFim)) return false;

      if (fValorMin && Number(ato.total || 0) < Number(fValorMin)) return false;
      if (fValorMax && Number(ato.total || 0) > Number(fValorMax)) return false;

      return true;
    });
  }, [atos, fCaptador, fEnvolvido, fStatus, fConfirmacao, fInicio, fFim, fValorMin, fValorMax]);

  const {
    page, setPage,
    pageSize, setPageSize,
    paginatedItems: atosPaginados,
    totalPages,
  } = usePagination(atosListados, paginationKey);

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
    const valorLancado = Number(ato.valor_pago_lancado || 0);
    const valorConfirmado = Number(ato.valor_pago || 0);
    const temLancamento = valorLancado > 0;
    const conferenciaPendente = temLancamento && valorConfirmado < valorLancado - 0.005;

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
      pago: (
        !temLancamento ? (
          <span style={{ color: '#94a3b8', fontSize: 12, whiteSpace: 'nowrap' }}>Sem lançamento</span>
        ) : conferenciaPendente ? (
          <div style={{ display: 'grid', gap: 2 }}>
            <span style={{ color: '#b45309', fontWeight: 700, whiteSpace: 'nowrap' }}>Lan: {fmt(valorLancado)}</span>
            <span style={{ color: '#64748b', fontSize: 12, whiteSpace: 'nowrap' }}>Conf: {fmt(valorConfirmado)}</span>
          </div>
        ) : (
          <span style={{ color: valorConfirmado >= tot ? '#22c55e' : '#ef4444', fontWeight: 700, whiteSpace: 'nowrap' }}>
            {fmt(valorConfirmado)}
          </span>
        )
      ),
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
      <Card style={{ marginBottom: 18, padding: 20, background: 'linear-gradient(180deg,#ffffff,#f8fbff)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e3a5f', textTransform: 'uppercase', letterSpacing: 0.8 }}>Filtros e Colunas</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
              Busca e filtros rápidos ficam visíveis. O restante abre em painéis laterais pensados para desktop e phone.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Btn variant="secondary" onClick={() => setShowAdvancedFilters(true)} style={{ padding: '9px 12px', fontSize: 12 }}>
              Filtros {advancedFilterCount > 0 ? `(${advancedFilterCount})` : ''}
            </Btn>
            <Btn variant="secondary" onClick={() => setShowColPanel(true)} style={{ padding: '9px 12px', fontSize: 12 }}>
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
                placeholder="Controle, L42P15, tomador, tipo ou escrevente..."
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
      </Card>

      <Sheet
        open={showAdvancedFilters}
        title="Filtros avançados"
        subtitle="Use estes filtros quando a operação sair da rotina rápida de status e conferência."
        onClose={() => setShowAdvancedFilters(false)}
        footer={(
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <Btn variant="secondary" onClick={resetFiltros} style={{ fontSize: 12, padding: '8px 12px' }}>
              Limpar tudo
            </Btn>
            <Btn variant="secondary" onClick={() => setShowAdvancedFilters(false)} style={{ fontSize: 12, padding: '8px 12px' }}>
              Fechar
            </Btn>
          </div>
        )}
      >
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ padding: 14, border: '1px solid #dbe4f0', borderRadius: 18, background: '#fff' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 }}>Pessoas</div>
            <div style={{ display: 'grid', gap: 12 }}>
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
            </div>
          </div>
          <div style={{ padding: 14, border: '1px solid #dbe4f0', borderRadius: 18, background: '#fff' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 }}>Período</div>
            <div style={{ display: 'grid', gap: 12 }}>
              <FInput label="Data inicial" type="date" value={fInicio} onChange={(e) => setFInicio(e.target.value)} />
              <FInput label="Data final" type="date" value={fFim} onChange={(e) => setFFim(e.target.value)} />
            </div>
          </div>
          <div style={{ padding: 14, border: '1px solid #dbe4f0', borderRadius: 18, background: '#fff' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 }}>Faixa de valor</div>
            <div style={{ display: 'grid', gap: 12 }}>
              <FInput label="Total mínimo" type="number" min="0" step="0.01" value={fValorMin} onChange={(e) => setFValorMin(e.target.value)} />
              <FInput label="Total máximo" type="number" min="0" step="0.01" value={fValorMax} onChange={(e) => setFValorMax(e.target.value)} />
            </div>
          </div>
        </div>
      </Sheet>

      <Sheet
        open={showColPanel}
        title="Colunas visíveis"
        subtitle="Ajuste a visualização sem poluir a listagem principal."
        onClose={() => setShowColPanel(false)}
        footer={(
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Btn variant="secondary" onClick={() => setSelectedCols(TODAS_COLUNAS.map((coluna) => coluna.key))} style={{ fontSize: 12, padding: '8px 12px' }}>
                Todas
              </Btn>
              <Btn variant="secondary" onClick={() => setSelectedCols(COLUNAS_PADRAO)} style={{ fontSize: 12, padding: '8px 12px' }}>
                Padrão
              </Btn>
            </div>
            <Btn variant="secondary" onClick={() => setShowColPanel(false)} style={{ fontSize: 12, padding: '8px 12px' }}>
              Fechar
            </Btn>
          </div>
        )}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10 }}>
          {TODAS_COLUNAS.map((coluna) => (
            <label
              key={coluna.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 13,
                cursor: 'pointer',
                border: selectedCols.includes(coluna.key) ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                borderRadius: 14,
                padding: '12px 13px',
                background: selectedCols.includes(coluna.key) ? '#eff6ff' : '#fff',
                color: selectedCols.includes(coluna.key) ? '#1d4ed8' : '#334155',
                fontWeight: selectedCols.includes(coluna.key) ? 700 : 500,
              }}
            >
              <input type="checkbox" checked={selectedCols.includes(coluna.key)} onChange={() => toggleCol(coluna.key)} style={{ width: 14, height: 14 }} />
              {coluna.label}
            </label>
          ))}
        </div>
      </Sheet>

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
              {atosPaginados.map((a, i) => (
                <tr key={a.id} style={{ borderTop: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}
                  onMouseOver={ev => ev.currentTarget.style.background = '#f0f7ff'}
                  onMouseOut={ev => ev.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafbfc'}>
                  {selectedCols.map((key) => (
                    <td key={key} style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                      {renderCell(a, key)}
                    </td>
                  ))}
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {podeConferirFinanceiro && (
                        (() => {
                          const conferenciaConcluida = Boolean(a.verificado_por);
                          const temLancamentoFinanceiro =
                            (Number(a.pagamentos_lancados || 0) > 0)
                            || (Number(a.valor_pago_lancado || a.valor_pago || 0) > 0);

                          return (
                            <Btn
                              variant={conferenciaConcluida ? 'success' : (temLancamentoFinanceiro ? 'warning' : 'secondary')}
                              onClick={() => onOpenAto({ ...a, _openSection: 'financeiro' })}
                              style={{ padding: '5px 14px', fontSize: 12, whiteSpace: 'nowrap' }}
                            >
                              {conferenciaConcluida
                                ? '✅ Conferido'
                                : (temLancamentoFinanceiro ? '💼 Conferir' : '➖ Sem pgto a conferir')}
                            </Btn>
                          );
                        })()
                      )}
                      <Btn variant="secondary" onClick={() => onOpenAto(a)} style={{ padding: '5px 14px', fontSize: 12, whiteSpace: 'nowrap' }}>🔍 Ver/Editar</Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </StickyXScroll>
        {atosListados.length === 0
          ? <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Nenhum ato encontrado.</div>
          : <Pagination
              page={page} setPage={setPage}
              pageSize={pageSize} setPageSize={setPageSize}
              totalPages={totalPages}
              totalItems={atosListados.length}
            />
        }
      </Card>
    </div>
  );
}
