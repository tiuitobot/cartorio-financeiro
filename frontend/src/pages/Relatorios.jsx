import { useEffect, useMemo, useRef, useState } from 'react';
import { usePagination, Pagination } from '../components/ui/Pagination.jsx';
import { Card, FInput, FSel, Btn, Badge, StickyXScroll, FilterChip, ActiveFilterTag, Sheet } from '../components/ui/index.jsx';
import { padControle, fmt, fmtDate, sColor } from '../utils/format.js';
import { exportXLSX, ALL_COLS } from '../utils/export.js';
import { FORMAS_PAGAMENTO } from '../constants.js';
import { atoMatchesSearch } from '../utils/search.js';
import ModalPgtoReembolso from '../components/modals/ModalPgtoReembolso.jsx';
import { areStringArraysEqual, normalizeColumnSelection, readColumnSelectionFromStorage } from '../utils/column-preferences.js';

// Formata o campo "Percentual/Fixo" do detalhamento de comissões.
function formatPctFixo(pct, fixo) {
  if (pct == null) {
    return `R$${Number(fixo || 0).toFixed(2).replace('.', ',')} (fixo)`;
  }
  const deducao = Number(fixo || 0);
  if (deducao < 0) {
    return `${pct}% − R$${Math.abs(deducao).toFixed(2).replace('.', ',')}`;
  }
  return `${pct}%`;
}

const hoje = new Date();
const mesAtual = hoje.toISOString().slice(0, 7);
const anoInicio = `${hoje.getFullYear()}-01-01`;
const anoFim = `${hoje.getFullYear()}-12-31`;
const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'pago', label: 'Pago' },
  { value: 'pago_menor', label: 'Pago a menor' },
  { value: 'pago_maior', label: 'Pago a maior' },
];
const PENDENCIA_TYPE_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'pendencia_pagamento', label: 'Pagamento' },
  { value: 'confirmacao_pendente', label: 'Confirmação pendente' },
  { value: 'manifestacao_escrevente', label: 'Manifestação do escrevente' },
  { value: 'informacao_conflitante', label: 'Informação conflitante' },
  { value: 'informacao_incompleta', label: 'Informação incompleta' },
];
const PENDENCIA_STATUS_OPTIONS = [
  { value: 'abertas', label: 'Abertas' },
  { value: 'solucionadas', label: 'Solucionadas' },
  { value: 'todas', label: 'Todas' },
];

function pendenciaLabel(tipo) {
  return PENDENCIA_TYPE_OPTIONS.find((item) => item.value === tipo)?.label || tipo;
}

function pendenciaColor(tipo) {
  return ({
    pendencia_pagamento: '#dc2626',
    confirmacao_pendente: '#d97706',
    manifestacao_escrevente: '#2563eb',
    informacao_conflitante: '#7c3aed',
    informacao_incompleta: '#0f766e',
  })[tipo] || '#64748b';
}

function origemLabel(origem) {
  return origem === 'escrevente' ? 'Escrevente' : 'Automática';
}

function isAutomaticPendencia(item) {
  return item?.origem === 'automatica';
}

function uniqueIds(values = []) {
  return [...new Set(values.filter((value) => Number.isInteger(value) && value > 0))];
}

const TH = ({ c }) => <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: 12, textTransform: 'uppercase', whiteSpace: 'nowrap', background: '#f1f5f9' }}>{c}</th>;
const TD = ({ c, bold, color }) => <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', fontWeight: bold ? 700 : 400, color: color || '#1e293b' }}>{c}</td>;

export default function Relatorios({
  atos,
  escreventes,
  pendencias,
  pagamentosReembolso,
  onAddPagamento,
  onConfirmarReembolso,
  onContestarReembolso,
  onOpenAto,
  onAtualizarPendencia,
  onOcultarPendencia,
  userRole,
  userId,
  initialTab,
  contestacoesReembolsoAbertas = [],
  userStorageKey,
  preferredAtosColumns,
  onSavePreferredAtosColumns,
}) {
  const storageKey = `colunas_relatorios_atos_${userStorageKey || 'anon'}`;
  const allowedColumnKeys = useMemo(
    () => ALL_COLS.map((item) => item.key),
    []
  );
  const defaultColumns = useMemo(
    () => ALL_COLS.filter((item) => item.def).map((item) => item.key),
    []
  );
  const preferredColumnsKey = Array.isArray(preferredAtosColumns) ? preferredAtosColumns.join('|') : '__none__';
  const normalizedPreferredColumns = useMemo(
    () => normalizeColumnSelection(preferredAtosColumns, allowedColumnKeys),
    [preferredColumnsKey, allowedColumnKeys]
  );
  const [tab, setTab] = useState('atos');
  const [selectedCols, setSelectedCols] = useState(() => (
    normalizedPreferredColumns
    ?? readColumnSelectionFromStorage(storageKey, allowedColumnKeys)
    ?? defaultColumns
  ));
  const [showColPanel, setShowColPanel] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showMensalPanel, setShowMensalPanel] = useState(false);
  const [showComPanel, setShowComPanel] = useState(false);
  const [showPendPanel, setShowPendPanel] = useState(false);
  const [selectedComDetalheId, setSelectedComDetalheId] = useState(null);
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
  const [pTipo, setPTipo] = useState('');
  const [pEscrevente, setPEscrevente] = useState('');
  const [pControle, setPControle] = useState('');
  const [pInicio, setPInicio] = useState('');
  const [pFim, setPFim] = useState('');
  const [pStatus, setPStatus] = useState('abertas');
  const [modalReembolso, setModalReembolso] = useState(null);
  const lastPersistedColsRef = useRef(normalizedPreferredColumns);
  const escreventesById = useMemo(
    () => new Map(escreventes.map((item) => [item.id, item])),
    [escreventes]
  );
  const atosById = useMemo(
    () => new Map(atos.map((item) => [item.id, item])),
    [atos]
  );

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
    if (!onSavePreferredAtosColumns) return undefined;
    if (lastPersistedColsRef.current && areStringArraysEqual(selectedCols, lastPersistedColsRef.current)) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      const nextSelection = [...selectedCols];
      onSavePreferredAtosColumns(nextSelection)
        .then(() => {
          lastPersistedColsRef.current = nextSelection;
        })
        .catch(() => {});
    }, 250);

    return () => window.clearTimeout(timer);
  }, [selectedCols, onSavePreferredAtosColumns]);

  useEffect(() => {
    if (initialTab) {
      setTab(initialTab);
    }
  }, [initialTab]);

  const tabs = [
    { key: 'atos', label: '📋 Atos' },
    { key: 'mensal', label: '📅 Mensal' },
    { key: 'comissoes', label: '📊 Comissões' },
    { key: 'pendencias', label: '⚠️ Pendências' },
    { key: 'reembolsos', label: contestacoesReembolsoAbertas.length > 0 && ['admin', 'financeiro', 'chefe_financeiro'].includes(userRole) ? `🔄 Reembolsos (${contestacoesReembolsoAbertas.length})` : '🔄 Reembolsos' },
  ];

  const atosFiltrados = useMemo(() => {
    let list = [...atos];
    if (fStatus) list = list.filter((ato) => ato.status === fStatus);
    if (fCaptador) list = list.filter((ato) => ato.captador_id === Number.parseInt(fCaptador, 10));
    if (fInicio) list = list.filter((ato) => ato.data_ato >= fInicio);
    if (fFim) list = list.filter((ato) => ato.data_ato <= fFim);
    if (fBusca) {
      list = list.filter((ato) => atoMatchesSearch(ato, fBusca, escreventesById));
    }
    return list;
  }, [atos, fStatus, fCaptador, fInicio, fFim, fBusca, escreventesById]);

  const toggleCol = (key) => {
    setSelectedCols((prev) => (
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    ));
  };

  const resetAtosFilters = () => {
    setFStatus('');
    setFCaptador('');
    setFInicio('');
    setFFim('');
    setFBusca('');
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
      id: escrevente.id,
      nome: escrevente.nome,
      qtdAtos: atosPraticados.length,
      emolumentos: totalEmolumentos,
      comissoes: totalComissao,
    };
  }).filter((item) => item.qtdAtos > 0 || item.comissoes > 0), [atos, escFiltrados, comInicio, comFim]);
  const escreventeDetalhe = escreventes.find((item) => item.id === selectedComDetalheId) || null;
  const dadosComDetalhe = useMemo(() => {
    if (!selectedComDetalheId) return [];

    return atos
      .filter((ato) => (!comInicio || ato.data_ato >= comInicio) && (!comFim || ato.data_ato <= comFim))
      .flatMap((ato) => (ato.comissoes || [])
        .filter((comissao) => comissao.escrevente_id === selectedComDetalheId)
        .map((comissao) => ({
          ato_id: ato.id,
          controle: ato.controle,
          livro: ato.livro,
          pagina: ato.pagina,
          data_ato: ato.data_ato,
          tipo_ato: ato.tipo_ato,
          emolumentos: ato.emolumentos,
          papel: comissao.papel,
          pct: comissao.pct,
          fixo: comissao.fixo,
          total: comissao.total,
        })))
      .sort((a, b) => String(b.data_ato || '').localeCompare(String(a.data_ato || '')) || String(b.controle || '').localeCompare(String(a.controle || '')));
  }, [atos, comFim, comInicio, selectedComDetalheId]);

  const dadosRembEsc = escreventes.map((escrevente) => {
    const lancado = atos.filter((ato) => ato.escrevente_reembolso_id === escrevente.id).reduce((sum, ato) => sum + ato.reembolso_devido_escrevente, 0);
    const pago = pagamentosReembolso.filter((pagamento) => pagamento.escrevente_id === escrevente.id).reduce((sum, pagamento) => sum + pagamento.valor, 0);
    return { ...escrevente, lancado, pago, saldo: lancado - pago };
  }).filter((item) => item.lancado > 0 || item.pago > 0);

  const getPendenciaEscreventeIds = (item) => {
    const ato = item.ato_id ? atosById.get(item.ato_id) : null;
    return uniqueIds([
      item.escrevente_id ?? null,
      ato?.captador_id ?? null,
      ato?.executor_id ?? null,
      ato?.signatario_id ?? null,
    ]);
  };

  const getPendenciaEscreventeLabel = (item) => {
    const nomes = [];
    if (item.escrevente_nome) nomes.push(item.escrevente_nome);
    for (const escreventeId of getPendenciaEscreventeIds(item)) {
      const nome = escreventesById.get(escreventeId)?.nome;
      if (nome && !nomes.includes(nome)) nomes.push(nome);
    }
    return nomes.length > 0 ? nomes.join(', ') : '—';
  };

  const pendenciasFiltradas = useMemo(() => {
    return [...pendencias]
      .filter((item) => {
        if (pStatus !== 'todas') {
          if (pStatus === 'abertas' && item.solucionado) return false;
          if (pStatus === 'solucionadas' && !item.solucionado) return false;
        }
        if (pTipo && item.tipo !== pTipo) return false;
        if (pEscrevente) {
          const filtroId = Number.parseInt(pEscrevente, 10);
          if (!getPendenciaEscreventeIds(item).includes(filtroId)) return false;
        }
        if (pControle) {
          const term = String(pControle).replace(/\D/g, '');
          const controleAtual = String(item.controle || '').replace(/\D/g, '');
          if (!controleAtual.includes(term)) return false;
        }
        const dataBase = item.data_ato || item.criado_em?.slice(0, 10) || '';
        if (pInicio && (!dataBase || dataBase < pInicio)) return false;
        if (pFim && (!dataBase || dataBase > pFim)) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.solucionado !== b.solucionado) return a.solucionado ? 1 : -1;
        if (a.solucionado) return String(b.solucionado_em || '').localeCompare(String(a.solucionado_em || ''));
        return String(a.criado_em || '').localeCompare(String(b.criado_em || ''));
      });
  }, [pendencias, pStatus, pTipo, pEscrevente, pControle, pInicio, pFim, atosById, escreventesById]);

  // Paginação por tab
  const storagePrefix = `pagination_rel_${userRole || 'anon'}`;
  const pagAtosRel    = usePagination(atosFiltrados,       `${storagePrefix}_atos`);
  const pagPendencias = usePagination(pendenciasFiltradas, `${storagePrefix}_pend`);
  const pagReembolsos = usePagination(dadosRembEsc,        `${storagePrefix}_remb`);
  const pagHistorico  = usePagination(
    [...pagamentosReembolso].sort((a, b) => b.data.localeCompare(a.data)),
    `${storagePrefix}_hist`
  );
  const pagComDetalhe = usePagination(dadosComDetalhe,     `${storagePrefix}_com_detalhe`);

  const captadorNome = escreventes.find((item) => item.id === Number.parseInt(fCaptador, 10))?.nome;
  const hasAtosFilters = Boolean(fStatus || fCaptador || fInicio || fFim || fBusca);
  const advancedAtosFilterCount = [fCaptador, fInicio, fFim].filter(Boolean).length;
  const activeAtosFilters = [
    fBusca ? { key: 'busca', label: `Busca: ${fBusca}`, onRemove: () => setFBusca('') } : null,
    fStatus ? { key: 'status', label: `Status: ${STATUS_OPTIONS.find((item) => item.value === fStatus)?.label}`, onRemove: () => setFStatus('') } : null,
    fCaptador ? { key: 'captador', label: `Captador: ${captadorNome || fCaptador}`, onRemove: () => setFCaptador('') } : null,
    fInicio ? { key: 'inicio', label: `De: ${fInicio}`, onRemove: () => setFInicio('') } : null,
    fFim ? { key: 'fim', label: `Até: ${fFim}`, onRemove: () => setFFim('') } : null,
  ].filter(Boolean);
  const activeMensalFilters = [
    mesFat ? { key: 'mes_fat', label: `Faturamento: ${mesFat}`, onRemove: null } : null,
    mesRec ? { key: 'mes_rec', label: `Recebimentos: ${mesRec}`, onRemove: null } : null,
  ].filter(Boolean);
  const activeComFilters = [
    comInicio ? { key: 'com_inicio', label: `De: ${comInicio}`, onRemove: () => setComInicio('') } : null,
    comFim ? { key: 'com_fim', label: `Até: ${comFim}`, onRemove: () => setComFim('') } : null,
    comEscIds.length > 0 ? { key: 'com_esc', label: `${comEscIds.length} escrevente(s)`, onRemove: () => setComEscIds([]) } : null,
  ].filter(Boolean);
  const pendEscreventeNome = escreventes.find((item) => item.id === Number.parseInt(pEscrevente, 10))?.nome;
  const activePendFilters = [
    pControle ? { key: 'controle', label: `Controle: ${pControle}`, onRemove: () => setPControle('') } : null,
    pTipo ? { key: 'tipo', label: `Tipo: ${pendenciaLabel(pTipo)}`, onRemove: () => setPTipo('') } : null,
    pEscrevente ? { key: 'escrevente', label: `Escrevente: ${pendEscreventeNome || pEscrevente}`, onRemove: () => setPEscrevente('') } : null,
    pInicio ? { key: 'inicio', label: `De: ${pInicio}`, onRemove: () => setPInicio('') } : null,
    pFim ? { key: 'fim', label: `Até: ${pFim}`, onRemove: () => setPFim('') } : null,
  ].filter(Boolean);

  const resetPendFilters = () => {
    setPTipo('');
    setPEscrevente('');
    setPControle('');
    setPInicio('');
    setPFim('');
    setPStatus('abertas');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 12, padding: 4 }}>
        {tabs.map((item) => (
          <button key={item.key} onClick={() => setTab(item.key)} style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 9, background: tab === item.key ? '#fff' : 'transparent', color: tab === item.key ? '#1e3a5f' : '#64748b', fontWeight: tab === item.key ? 700 : 500, fontSize: 13, cursor: 'pointer', boxShadow: tab === item.key ? '0 1px 4px #0f2a5520' : 'none' }}>{item.label}</button>
        ))}
      </div>

      {tab === 'atos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card style={{ padding: 20, background: 'linear-gradient(180deg,#ffffff,#f8fbff)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e3a5f', textTransform: 'uppercase', letterSpacing: 0.8 }}>Filtros do Relatório</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  Busca e status ficam visíveis. Captador, datas e colunas abrem em painéis laterais.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <Btn variant="secondary" onClick={() => setShowFilterPanel(true)} style={{ padding: '9px 12px', fontSize: 12 }}>
                  Filtros {advancedAtosFilterCount > 0 ? `(${advancedAtosFilterCount})` : ''}
                </Btn>
                <Btn variant="secondary" onClick={() => setShowColPanel(true)} style={{ padding: '9px 12px', fontSize: 12 }}>
                  ⚙️ Colunas ({selectedCols.length})
                </Btn>
                <Btn onClick={handleExportAtos} style={{ padding: '9px 12px', fontSize: 12 }}>
                  📥 Excel
                </Btn>
                {hasAtosFilters && (
                  <Btn variant="secondary" onClick={resetAtosFilters} style={{ padding: '9px 12px', fontSize: 12 }}>
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
                    placeholder="Controle, L42P15, tomador, tipo ou escrevente"
                    value={fBusca}
                    onChange={(e) => setFBusca(e.target.value)}
                    style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: '#1e293b' }}
                  />
                </div>
                <div style={{ marginTop: 10, fontSize: 12, color: '#64748b' }}>
                  {atosFiltrados.length} resultado(s) com os filtros atuais.
                </div>
              </div>
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
            </div>

            {activeAtosFilters.length > 0 && (
              <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', paddingTop: 14, borderTop: '1px dashed #dbe4f0' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.7 }}>Filtros ativos</div>
                {activeAtosFilters.map((filter) => (
                  <ActiveFilterTag key={filter.key} label={filter.label} onRemove={filter.onRemove} />
                ))}
              </div>
            )}
          </Card>

          <Sheet
            open={showFilterPanel}
            title="Filtros avançados"
            subtitle="Refine o relatório por captador e período sem poluir a área principal."
            onClose={() => setShowFilterPanel(false)}
            footer={(
              <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <Btn variant="secondary" onClick={resetAtosFilters} style={{ fontSize: 12, padding: '8px 12px' }}>
                  Limpar tudo
                </Btn>
                <Btn variant="secondary" onClick={() => setShowFilterPanel(false)} style={{ fontSize: 12, padding: '8px 12px' }}>
                  Fechar
                </Btn>
              </div>
            )}
          >
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ padding: 14, border: '1px solid #dbe4f0', borderRadius: 18, background: '#fff' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 }}>Pessoa</div>
                <FSel
                  label="Captador"
                  options={[{ value: '', label: 'Todos' }, ...escreventes.map((item) => ({ value: item.id, label: item.nome }))]}
                  value={fCaptador}
                  onChange={(e) => setFCaptador(e.target.value)}
                />
              </div>
              <div style={{ padding: 14, border: '1px solid #dbe4f0', borderRadius: 18, background: '#fff' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 }}>Período</div>
                <div style={{ display: 'grid', gap: 12 }}>
                  <FInput label="Data inicial" type="date" value={fInicio} onChange={(e) => setFInicio(e.target.value)} />
                  <FInput label="Data final" type="date" value={fFim} onChange={(e) => setFFim(e.target.value)} />
                </div>
              </div>
            </div>
          </Sheet>

          <Sheet
            open={showColPanel}
            title="Colunas visíveis"
            subtitle="Ajuste a tabela do relatório sem criar uma grade fixa pesada."
            onClose={() => setShowColPanel(false)}
            footer={(
              <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Btn variant="secondary" onClick={() => setSelectedCols(ALL_COLS.map((coluna) => coluna.key))} style={{ fontSize: 12, padding: '8px 12px' }}>
                    Todas
                  </Btn>
                  <Btn variant="secondary" onClick={() => setSelectedCols(defaultColumns)} style={{ fontSize: 12, padding: '8px 12px' }}>
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
              {ALL_COLS.map((coluna) => (
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
                  {pagAtosRel.paginatedItems.map((ato, index) => (
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
            {atosFiltrados.length === 0
              ? <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Nenhum ato encontrado.</div>
              : <Pagination
                  page={pagAtosRel.page} setPage={pagAtosRel.setPage}
                  pageSize={pagAtosRel.pageSize} setPageSize={pagAtosRel.setPageSize}
                  totalPages={pagAtosRel.totalPages}
                  totalItems={atosFiltrados.length}
                />
            }
          </Card>
        </div>
      )}

      {tab === 'mensal' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Card style={{ padding: 20, background: 'linear-gradient(180deg,#ffffff,#f8fbff)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e3a5f', textTransform: 'uppercase', letterSpacing: 0.8 }}>Períodos do Relatório Mensal</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  Os meses de faturamento e recebimento saem do layout principal e ficam em um sheet único.
                </div>
              </div>
              <Btn variant="secondary" onClick={() => setShowMensalPanel(true)} style={{ padding: '9px 12px', fontSize: 12 }}>
                Períodos
              </Btn>
            </div>
            <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.7 }}>Seleção ativa</div>
              {activeMensalFilters.map((filter) => (
                <span
                  key={filter.key}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    border: '1px solid #dbe4f0',
                    background: '#fff',
                    color: '#475569',
                    borderRadius: 999,
                    padding: '6px 10px',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {filter.label}
                </span>
              ))}
            </div>
          </Card>

          <Sheet
            open={showMensalPanel}
            title="Períodos do relatório mensal"
            subtitle="Defina separadamente o mês de faturamento e o mês de recebimentos."
            onClose={() => setShowMensalPanel(false)}
            footer={(
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Btn variant="secondary" onClick={() => setShowMensalPanel(false)} style={{ fontSize: 12, padding: '8px 12px' }}>
                  Fechar
                </Btn>
              </div>
            )}
          >
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ padding: 14, border: '1px solid #dbe4f0', borderRadius: 18, background: '#fff' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 }}>Faturamento</div>
                <FInput label="Mês" type="month" value={mesFat} onChange={(e) => setMesFat(e.target.value)} />
              </div>
              <div style={{ padding: 14, border: '1px solid #dbe4f0', borderRadius: 18, background: '#fff' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 }}>Recebimentos</div>
                <FInput label="Mês" type="month" value={mesRec} onChange={(e) => setMesRec(e.target.value)} />
              </div>
            </div>
          </Sheet>

          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: '#1e3a5f', fontSize: 15 }}>📋 Faturamento do Mês</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, color: '#475569', fontWeight: 700 }}>
                  {mesFat}
                </div>
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
              <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, color: '#475569', fontWeight: 700 }}>
                {mesRec}
              </div>
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
          <Card style={{ padding: 20, background: 'linear-gradient(180deg,#ffffff,#f8fbff)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e3a5f', textTransform: 'uppercase', letterSpacing: 0.8 }}>Filtros de Comissões</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  Período e escreventes selecionados ficam em um painel lateral único, como nas demais listagens.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Btn variant="secondary" onClick={() => setShowComPanel(true)} style={{ fontSize: 12, padding: '9px 12px' }}>
                  Filtros
                </Btn>
                <Btn onClick={() => exportXLSX(dadosCom.map((item) => ({ Escrevente: item.nome, 'Atos Praticados': item.qtdAtos, 'Total Emolumentos': item.emolumentos, 'Total Comissões': item.comissoes })), 'Comissões', 'comissoes.xlsx')} style={{ fontSize: 12, padding: '9px 12px' }}>
                  📥 Excel
                </Btn>
                {activeComFilters.length > 0 && (
                  <Btn variant="secondary" onClick={() => { setComInicio(anoInicio); setComFim(anoFim); setComEscIds([]); }} style={{ fontSize: 12, padding: '9px 12px' }}>
                    Limpar tudo
                  </Btn>
                )}
              </div>
            </div>
            {activeComFilters.length > 0 && (
              <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.7 }}>Filtros ativos</div>
                {activeComFilters.map((filter) => (
                  <ActiveFilterTag key={filter.key} label={filter.label} onRemove={filter.onRemove} />
                ))}
              </div>
            )}
          </Card>

          <Sheet
            open={showComPanel}
            title="Filtros de comissões"
            subtitle="Defina período e restringa escreventes sem ocupar a área principal do relatório."
            onClose={() => setShowComPanel(false)}
            footer={(
              <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <Btn variant="secondary" onClick={() => { setComInicio(anoInicio); setComFim(anoFim); setComEscIds([]); }} style={{ fontSize: 12, padding: '8px 12px' }}>
                  Limpar tudo
                </Btn>
                <Btn variant="secondary" onClick={() => setShowComPanel(false)} style={{ fontSize: 12, padding: '8px 12px' }}>
                  Fechar
                </Btn>
              </div>
            )}
          >
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ padding: 14, border: '1px solid #dbe4f0', borderRadius: 18, background: '#fff' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 }}>Período</div>
                <div style={{ display: 'grid', gap: 12 }}>
                  <FInput label="Início" type="date" value={comInicio} onChange={(e) => setComInicio(e.target.value)} />
                  <FInput label="Fim" type="date" value={comFim} onChange={(e) => setComFim(e.target.value)} />
                </div>
              </div>
              <div style={{ padding: 14, border: '1px solid #dbe4f0', borderRadius: 18, background: '#fff' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 }}>Escreventes</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {escreventes.map((item) => (
                    <FilterChip
                      key={item.id}
                      active={comEscIds.includes(item.id)}
                      onClick={() => setComEscIds((prev) => prev.includes(item.id) ? prev.filter((value) => value !== item.id) : [...prev, item.id])}
                    >
                      {item.nome.split(' ')[0]}
                    </FilterChip>
                  ))}
                </div>
              </div>
            </div>
          </Sheet>

          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <StickyXScroll>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 940 }}>
                <thead><tr style={{ background: '#f1f5f9' }}>{['Escrevente', 'Atos Praticados', 'Total Emolumentos', 'Total Comissão', ''].map((header) => <TH key={header} c={header} />)}</tr></thead>
                <tbody>
                  {dadosCom.map((item, index) => (
                    <tr key={item.id} style={{ borderTop: '1px solid #f1f5f9', background: index % 2 === 0 ? '#fff' : '#fafbfc' }}>
                      <TD c={item.nome} bold />
                      <TD c={item.qtdAtos} />
                      <TD c={fmt(item.emolumentos)} bold />
                      <TD c={fmt(item.comissoes)} bold />
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <Btn variant="secondary" onClick={() => setSelectedComDetalheId(item.id)} style={{ fontSize: 12, padding: '6px 12px' }}>
                          Detalhar
                        </Btn>
                      </td>
                    </tr>
                  ))}
                  {dadosCom.length > 0 && (
                    <tr style={{ borderTop: '2px solid #e2e8f0', background: '#f0f4ff' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#1e3a5f' }}>TOTAL</td>
                      <TD c={dadosCom.reduce((sum, item) => sum + item.qtdAtos, 0)} bold />
                      <TD c={fmt(dadosCom.reduce((sum, item) => sum + item.emolumentos, 0))} bold />
                      <TD c={fmt(dadosCom.reduce((sum, item) => sum + item.comissoes, 0))} bold />
                      <td style={{ padding: '10px 14px' }} />
                    </tr>
                  )}
                </tbody>
              </table>
            </StickyXScroll>
            {dadosCom.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Nenhum dado no período.</div>}
          </Card>

          <Sheet
            open={Boolean(selectedComDetalheId)}
            title={escreventeDetalhe ? `Comissões de ${escreventeDetalhe.nome}` : 'Detalhe de comissões'}
            subtitle="Detalhamento por ato no período filtrado, usando a taxa histórica vigente em cada data."
            onClose={() => setSelectedComDetalheId(null)}
            width="60vw"
            footer={(
              <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <Btn
                  onClick={() => exportXLSX(
                    dadosComDetalhe.map((item) => ({
                      Data: item.data_ato,
                      Controle: item.controle,
                      Livro: item.livro,
                      Página: item.pagina,
                      Papel: item.papel,
                      'Percentual/Fixo': formatPctFixo(item.pct, item.fixo),
                      Comissão: item.total,
                    })),
                    'Detalhe Comissões',
                    'detalhe_comissoes.xlsx'
                  )}
                  style={{ fontSize: 12, padding: '8px 12px' }}
                >
                  📥 Excel
                </Btn>
                <Btn variant="secondary" onClick={() => setSelectedComDetalheId(null)} style={{ fontSize: 12, padding: '8px 12px' }}>
                  Fechar
                </Btn>
              </div>
            )}
          >
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                {[
                  { l: 'Atos', v: dadosComDetalhe.length },
                  { l: 'Emolumentos base', v: fmt(dadosComDetalhe.reduce((sum, item) => sum + Number(item.emolumentos || 0), 0)) },
                  { l: 'Comissão total', v: fmt(dadosComDetalhe.reduce((sum, item) => sum + Number(item.total || 0), 0)) },
                ].map((metric) => (
                  <div key={metric.l} style={{ border: '1px solid #dbe4f0', borderRadius: 14, background: '#fff', padding: '12px 14px' }}>
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>{metric.l}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#1e3a5f', marginTop: 4 }}>{metric.v}</div>
                  </div>
                ))}
              </div>
              <div style={{ border: '1px solid #dbe4f0', borderRadius: 18, overflow: 'hidden', background: '#fff' }}>
                <StickyXScroll>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 860 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {['Data', 'Controle', 'Referência', 'Papel', 'Base', 'Percentual/Fixo', 'Comissão'].map((header) => <TH key={header} c={header} />)}
                      </tr>
                    </thead>
                    <tbody>
                      {pagComDetalhe.paginatedItems.map((item, index) => (
                        <tr key={`${item.ato_id}-${item.papel}-${index}`} style={{ borderTop: '1px solid #f1f5f9', background: index % 2 === 0 ? '#fff' : '#fafbfc' }}>
                          <TD c={fmtDate(item.data_ato)} />
                          <TD c={padControle(item.controle)} bold />
                          <TD c={`${item.livro}/${item.pagina}`} />
                          <TD c={item.papel} />
                          <TD c={fmt(item.emolumentos)} />
                          <TD c={formatPctFixo(item.pct, item.fixo)} />
                          <TD c={fmt(item.total)} bold />
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </StickyXScroll>
                {dadosComDetalhe.length === 0
                  ? <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>
                      Nenhuma comissão encontrada para este escrevente no período atual.
                    </div>
                  : <Pagination
                      page={pagComDetalhe.page} setPage={pagComDetalhe.setPage}
                      pageSize={pagComDetalhe.pageSize} setPageSize={pagComDetalhe.setPageSize}
                      totalPages={pagComDetalhe.totalPages}
                      totalItems={dadosComDetalhe.length}
                    />
                }
              </div>
            </div>
          </Sheet>
        </div>
      )}

      {tab === 'pendencias' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card style={{ padding: 20, background: 'linear-gradient(180deg,#ffffff,#f8fbff)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e3a5f', textTransform: 'uppercase', letterSpacing: 0.8 }}>Conciliação e Pendências</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  Pendências abertas ficam no topo. Filtros detalhados saem da grade principal e entram em um sheet dedicado.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Btn variant="secondary" onClick={() => setShowPendPanel(true)} style={{ fontSize: 12, padding: '9px 12px' }}>
                  Filtros
                </Btn>
                {activePendFilters.length > 0 && (
                  <Btn variant="secondary" onClick={resetPendFilters} style={{ fontSize: 12, padding: '9px 12px' }}>
                    Limpar tudo
                  </Btn>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(0, 1fr)', gap: 18, alignItems: 'start' }}>
              <div style={{ background: '#ffffff', border: '1px solid #dbe4f0', borderRadius: 18, padding: 16, boxShadow: 'inset 0 1px 0 #ffffff, 0 10px 24px #0f2a5508' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>Busca principal</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #dbe4f0', borderRadius: 14, padding: '10px 14px', background: '#f8fbff' }}>
                  <span style={{ fontSize: 16, color: '#1d4ed8' }}>⌕</span>
                  <input
                    placeholder="Controle da pendência"
                    value={pControle}
                    onChange={(e) => setPControle(e.target.value)}
                    style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: '#1e293b' }}
                  />
                </div>
                <div style={{ marginTop: 10, fontSize: 12, color: '#64748b' }}>
                  {pendenciasFiltradas.length} pendência(s) encontradas.
                </div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #dbe4f0', borderRadius: 18, padding: 14, boxShadow: 'inset 0 1px 0 #ffffff, 0 10px 24px #0f2a5508' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 }}>Status</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {PENDENCIA_STATUS_OPTIONS.map((option) => (
                    <FilterChip key={option.value} active={pStatus === option.value} onClick={() => setPStatus(option.value)}>
                      {option.label}
                    </FilterChip>
                  ))}
                </div>
              </div>
            </div>

            {activePendFilters.length > 0 && (
              <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', paddingTop: 14, borderTop: '1px dashed #dbe4f0' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.7 }}>Filtros ativos</div>
                {activePendFilters.map((filter) => (
                  <ActiveFilterTag key={filter.key} label={filter.label} onRemove={filter.onRemove} />
                ))}
              </div>
            )}
          </Card>

          <Sheet
            open={showPendPanel}
            title="Filtros de pendências"
            subtitle="Refine a fila por tipo, escrevente e período sem transformar a tela em formulário."
            onClose={() => setShowPendPanel(false)}
            footer={(
              <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <Btn variant="secondary" onClick={resetPendFilters} style={{ fontSize: 12, padding: '8px 12px' }}>
                  Limpar tudo
                </Btn>
                <Btn variant="secondary" onClick={() => setShowPendPanel(false)} style={{ fontSize: 12, padding: '8px 12px' }}>
                  Fechar
                </Btn>
              </div>
            )}
          >
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ padding: 14, border: '1px solid #dbe4f0', borderRadius: 18, background: '#fff' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 }}>Classificação</div>
                <FSel
                  label="Tipo"
                  options={PENDENCIA_TYPE_OPTIONS}
                  value={pTipo}
                  onChange={(e) => setPTipo(e.target.value)}
                />
              </div>
              <div style={{ padding: 14, border: '1px solid #dbe4f0', borderRadius: 18, background: '#fff' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 }}>Pessoa</div>
                <FSel
                  label="Escrevente"
                  options={[{ value: '', label: 'Todos' }, ...escreventes.map((item) => ({ value: item.id, label: item.nome }))]}
                  value={pEscrevente}
                  onChange={(e) => setPEscrevente(e.target.value)}
                />
              </div>
              <div style={{ padding: 14, border: '1px solid #dbe4f0', borderRadius: 18, background: '#fff' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 }}>Período</div>
                <div style={{ display: 'grid', gap: 12 }}>
                  <FInput label="Data inicial" type="date" value={pInicio} onChange={(e) => setPInicio(e.target.value)} />
                  <FInput label="Data final" type="date" value={pFim} onChange={(e) => setPFim(e.target.value)} />
                </div>
              </div>
            </div>
          </Sheet>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {[
              { l: 'Abertas', v: pendencias.filter((item) => !item.solucionado).length, c: '#dc2626' },
              { l: 'Solucionadas', v: pendencias.filter((item) => item.solucionado).length, c: '#16a34a' },
              { l: 'Visíveis', v: pendencias.length, c: '#1e3a5f' },
            ].map((metric) => (
              <div key={metric.l} style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', border: '1px solid #e8edf5' }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{metric.l}</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: metric.c }}>{metric.v}</div>
              </div>
            ))}
          </div>

          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <StickyXScroll>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 1160 }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    {['Criada em', 'Controle', 'Referência', 'Tipo', 'Descrição', 'Escrevente', 'Origem', 'Status', ''].map((header) => <TH key={header} c={header} />)}
                  </tr>
                </thead>
                <tbody>
                  {pagPendencias.paginatedItems.map((item, index) => {
                    const ato = atos.find((atoAtual) => atoAtual.id === item.ato_id) || null;
                    const automatic = isAutomaticPendencia(item);
                    const canOpenConference = (
                      item.tipo === 'confirmacao_pendente'
                      && ['admin', 'financeiro', 'chefe_financeiro'].includes(userRole)
                      && item.pode_abrir_ato
                      && ato
                    );
                    return (
                      <tr key={item.id} style={{ borderTop: '1px solid #f1f5f9', background: index % 2 === 0 ? '#fff' : '#fafbfc' }}>
                        <TD c={fmtDate(item.criado_em)} />
                        <TD c={item.controle ? padControle(item.controle) : '—'} bold />
                        <TD c={item.acesso_ato_restrito ? 'Acesso restrito' : (item.referencia || '—')} />
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                          <Badge label={pendenciaLabel(item.tipo)} color={pendenciaColor(item.tipo)} />
                        </td>
                        <td style={{ padding: '10px 14px', color: '#334155', minWidth: 320, lineHeight: 1.45 }}>
                          {item.descricao}
                          {item.acesso_ato_restrito && (
                            <div style={{ fontSize: 12, color: '#92400e', marginTop: 6 }}>
                              Dados do ato restritos até tratamento pelo financeiro.
                            </div>
                          )}
                        </td>
                        <TD c={getPendenciaEscreventeLabel(item)} />
                        <TD c={origemLabel(item.origem)} />
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                          <Badge label={item.solucionado ? 'Solucionada' : 'Aberta'} color={item.solucionado ? '#16a34a' : '#dc2626'} />
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                            {canOpenConference && (
                              <Btn
                                variant="warning"
                                onClick={() => onOpenAto?.({ ...ato, _openSection: 'financeiro' })}
                                style={{ fontSize: 12, padding: '6px 12px' }}
                              >
                                Abrir conferência
                              </Btn>
                            )}
                            {item.pode_abrir_ato && ato && !canOpenConference && (
                              <Btn variant="secondary" onClick={() => onOpenAto?.(ato)} style={{ fontSize: 12, padding: '6px 12px' }}>
                                Abrir ato
                              </Btn>
                            )}
                            {['admin', 'financeiro', 'chefe_financeiro'].includes(userRole) && !item.solucionado && (
                              <Btn
                                variant="success"
                                onClick={async () => {
                                  const resolucao = window.prompt('Observação da solução (opcional):', '');
                                  if (resolucao === null) return;
                                  await onAtualizarPendencia?.(item.id, { solucionado: true, resolucao });
                                }}
                                style={{ fontSize: 12, padding: '6px 12px' }}
                              >
                                Solucionar
                              </Btn>
                            )}
                            {['admin', 'financeiro', 'chefe_financeiro'].includes(userRole) && item.solucionado && (
                              <>
                                {!automatic && (
                                  <Btn
                                    variant="warning"
                                    onClick={async () => { await onAtualizarPendencia?.(item.id, { solucionado: false }); }}
                                    style={{ fontSize: 12, padding: '6px 12px' }}
                                  >
                                    Reabrir
                                  </Btn>
                                )}
                                <Btn
                                  variant="secondary"
                                  onClick={async () => { await onOcultarPendencia?.(item.id); }}
                                  style={{ fontSize: 12, padding: '6px 12px' }}
                                >
                                  Ocultar
                                </Btn>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </StickyXScroll>
            {pendenciasFiltradas.length === 0
              ? <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                  Nenhuma pendência encontrada com os filtros atuais.
                </div>
              : <Pagination
                  page={pagPendencias.page} setPage={pagPendencias.setPage}
                  pageSize={pagPendencias.pageSize} setPageSize={pagPendencias.setPageSize}
                  totalPages={pagPendencias.totalPages}
                  totalItems={pendenciasFiltradas.length}
                />
            }
          </Card>
        </div>
      )}

      {tab === 'reembolsos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {['admin', 'financeiro', 'chefe_financeiro'].includes(userRole) && contestacoesReembolsoAbertas.length > 0 && (
            <Card style={{ borderLeft: '4px solid #f97316', background: '#fff7ed' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#9a3412' }}>⚠️ Contestação de Reembolso Aguardando Financeiro ({contestacoesReembolsoAbertas.length})</div>
                  <div style={{ fontSize: 12, color: '#9a3412', marginTop: 4 }}>
                    O escrevente contestou o pagamento. Resolver aqui encerra o alerta e também a pendência operacional.
                  </div>
                </div>
                <Btn variant="secondary" onClick={() => setTab('pendencias')} style={{ padding: '8px 12px', fontSize: 12 }}>
                  Ver Pendências
                </Btn>
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {contestacoesReembolsoAbertas.map((item) => (
                  <div key={item.id} style={{ padding: '12px 14px', background: '#fff', borderRadius: 12, border: '1px solid #fdba74' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ display: 'grid', gap: 4 }}>
                        <div style={{ fontWeight: 700, color: '#7c2d12' }}>{item.escrevente?.nome || 'Escrevente não identificado'}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>
                          Valor: <strong>{fmt(item.pagamento?.valor || 0)}</strong> · Data: <strong>{fmtDate(item.pagamento?.data || item.criado_em)}</strong>
                        </div>
                        <div style={{ fontSize: 12, color: '#475569' }}>
                          Justificativa: <em>{item.justificativa}</em>
                        </div>
                      </div>
                      <Btn variant="success" onClick={() => onConfirmarReembolso?.(item.reembolso_id)} style={{ fontSize: 12, padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        Confirmar Pagamento
                      </Btn>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

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
                      {pagReembolsos.paginatedItems.map((item, index) => (
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
              <Pagination
                page={pagReembolsos.page} setPage={pagReembolsos.setPage}
                pageSize={pagReembolsos.pageSize} setPageSize={pagReembolsos.setPageSize}
                totalPages={pagReembolsos.totalPages}
                totalItems={dadosRembEsc.length}
              />
          </Card>

          {pagamentosReembolso.length > 0 && (
            <Card>
              <div style={{ fontWeight: 700, color: '#1e3a5f', fontSize: 15, marginBottom: 14 }}>🕐 Histórico de Pagamentos</div>
              <StickyXScroll>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 980 }}>
                  <thead><tr style={{ background: '#f1f5f9' }}>{['Data', 'Escrevente', 'Valor', 'Status', 'Ações', 'Obs.'].map((header) => <TH key={header} c={header} />)}</tr></thead>
                  <tbody>
                    {pagHistorico.paginatedItems.map((pagamento, index) => {
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
              <Pagination
                page={pagHistorico.page} setPage={pagHistorico.setPage}
                pageSize={pagHistorico.pageSize} setPageSize={pagHistorico.setPageSize}
                totalPages={pagHistorico.totalPages}
                totalItems={pagamentosReembolso.length}
              />
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
