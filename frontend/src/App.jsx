import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { api } from './api.js';
import { toMoneyNumber } from './utils/format.js';
import { normalizeFormaPagamento } from './constants.js';
import { atoMatchesSearch } from './utils/search.js';
import { buildOpenReembolsoContestacoes } from './utils/reembolso-alerts.js';

// Pages
import TelaLogin      from './pages/TelaLogin.jsx';
import Dashboard      from './pages/Dashboard.jsx';
import Atos           from './pages/Atos.jsx';
import DespesasRegistro from './pages/DespesasRegistro.jsx';
import Importacoes    from './pages/Importacoes.jsx';
import Relatorios     from './pages/Relatorios.jsx';
import Escreventes    from './pages/Escreventes.jsx';
import PainelUsuarios from './pages/PainelUsuarios.jsx';

// Modals
import ModalAto                  from './components/modals/ModalAto.jsx';
import ModalEscrevente           from './components/modals/ModalEscrevente.jsx';
import ModalManifestarPendencia  from './components/modals/ModalManifestarPendencia.jsx';
import ModalTrocarSenha          from './components/modals/ModalTrocarSenha.jsx';

function sortEscreventesByNome(items = []) {
  return [...items].sort((a, b) =>
    String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt-BR', { sensitivity: 'base' })
  );
}

function sortAtos(items = []) {
  return [...items].sort((a, b) => {
    const dataA = a?.data_ato || '';
    const dataB = b?.data_ato || '';
    if (dataA !== dataB) return dataB.localeCompare(dataA);

    const livroA = Number.parseInt(a?.livro || 0, 10) || 0;
    const livroB = Number.parseInt(b?.livro || 0, 10) || 0;
    if (livroA !== livroB) return livroB - livroA;

    const paginaA = Number.parseInt(a?.pagina || 0, 10) || 0;
    const paginaB = Number.parseInt(b?.pagina || 0, 10) || 0;
    if (paginaA !== paginaB) return paginaB - paginaA;

    return (b?.id || 0) - (a?.id || 0);
  });
}

function sortDespesasRegistro(items = []) {
  return [...items].sort((a, b) => {
    const dataA = a?.data_registro || '';
    const dataB = b?.data_registro || '';
    if (dataA !== dataB) return dataB.localeCompare(dataA);

    const createdA = a?.created_at || '';
    const createdB = b?.created_at || '';
    if (createdA !== createdB) return createdB.localeCompare(createdA);

    return (b?.id || 0) - (a?.id || 0);
  });
}

export default function App() {
  const [user, setUser]                           = useState(null);
  const [loadingApp, setLoadingApp]               = useState(true);
  const [loadingDados, setLoadingDados]           = useState(false);
  const [dadosInicializados, setDadosInicializados] = useState(false);
  const [atos, setAtos]                           = useState([]);
  const [escreventes, setEscreventes]             = useState([]);
  const [despesasRegistro, setDespesasRegistro]   = useState([]);
  const [pagamentosReembolso, setPagamentosReembolso] = useState([]);
  const [pendencias, setPendencias]               = useState([]);
  const [preferenciasUsuario, setPreferenciasUsuario] = useState({});
  const [relatoriosInitialTab, setRelatoriosInitialTab] = useState(null);
  const [view, setView]                           = useState('dashboard');
  const [modalAto, setModalAto]                   = useState(null);
  const [modalEscrevente, setModalEscrevente]     = useState(null);
  const [modalManifestarPendencia, setModalManifestarPendencia] = useState(false);
  const [modalSenha, setModalSenha]               = useState(false);
  const [busca, setBusca]                         = useState('');
  const [erro, setErro]                           = useState('');
  const [importacoesRefreshKey, setImportacoesRefreshKey] = useState(0);
  const preferenciasRequestSeqRef = useRef(0);

  const userRole = user?.perfil || 'escrevente';
  const userId   = user?.escrevente_id || null;
  const precisaTrocarSenha = user?.precisa_trocar_senha === true;
  const isAuxiliarRegistro = userRole === 'auxiliar_registro';
  const canAccessRegistro = ['admin', 'financeiro', 'chefe_financeiro', 'auxiliar_registro'].includes(userRole);

  const normalizeComissoes = useCallback((comissoes = []) => (
    Array.isArray(comissoes)
      ? comissoes.map((item) => ({
          ...item,
          total: toMoneyNumber(item.total),
          fixo: toMoneyNumber(item.fixo),
        }))
      : []
  ), []);

  const normalizePagamentos = useCallback((pagamentos = []) => (
    Array.isArray(pagamentos)
      ? pagamentos.map((item) => ({
          ...item,
          valor: toMoneyNumber(item.valor),
          forma_pagamento: normalizeFormaPagamento(item.forma_pagamento),
          confirmado_financeiro: item.confirmado_financeiro === true,
        }))
      : []
  ), []);

  const normalizeAto = useCallback((ato) => ({
    ...ato,
    total: toMoneyNumber(ato.total),
    emolumentos: toMoneyNumber(ato.emolumentos),
    repasses: toMoneyNumber(ato.repasses),
    issqn: toMoneyNumber(ato.issqn),
    reembolso_tabeliao: toMoneyNumber(ato.reembolso_tabeliao),
    reembolso_escrevente: toMoneyNumber(ato.reembolso_escrevente),
    valor_pago: toMoneyNumber(ato.valor_pago),
    valor_pago_confirmado: toMoneyNumber(ato.valor_pago_confirmado ?? ato.valor_pago),
    valor_pago_lancado: toMoneyNumber(ato.valor_pago_lancado),
    reembolso_devido_escrevente: toMoneyNumber(ato.reembolso_devido_escrevente),
    forma_pagamento: normalizeFormaPagamento(ato.forma_pagamento),
    forma_pagamento_confirmado: normalizeFormaPagamento(ato.forma_pagamento_confirmado ?? ato.forma_pagamento),
    forma_pagamento_lancado: normalizeFormaPagamento(ato.forma_pagamento_lancado),
    status_calculado: ato.status_calculado || ato.status,
    pagamentos_lancados: Number.parseInt(ato.pagamentos_lancados || 0, 10) || 0,
    pagamentos_confirmados: Number.parseInt(ato.pagamentos_confirmados || 0, 10) || 0,
    pagamentos_pendentes_confirmacao: Number.parseInt(ato.pagamentos_pendentes_confirmacao || 0, 10) || 0,
    tem_pagamento_pendente_confirmacao: ato.tem_pagamento_pendente_confirmacao === true,
    pagamentos: normalizePagamentos(ato.pagamentos),
    comissoes: normalizeComissoes(ato.comissoes),
  }), [normalizeComissoes, normalizePagamentos]);

  const normalizeReembolso = useCallback((pagamento) => ({
    ...pagamento,
    valor: toMoneyNumber(pagamento.valor),
  }), []);

  const normalizeDespesaRegistro = useCallback((item) => ({
    ...item,
    valor: toMoneyNumber(item.valor),
  }), []);

  // ── Autenticação ao iniciar ──────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('cartorio_token');
    if (!token) { setLoadingApp(false); return; }
    api.me().then((u) => {
      setUser(u);
      setView(u.perfil === 'auxiliar_registro' ? 'despesas_registro' : 'dashboard');
      setModalSenha(u.precisa_trocar_senha === true);
    }).catch(() => {
      localStorage.removeItem('cartorio_token');
    }).finally(() => setLoadingApp(false));
  }, []);

  // ── Carregar dados ───────────────────────────────────────────────────────────
  const carregarDados = useCallback(async () => {
    if (!user) return;
    if (user.precisa_trocar_senha) {
      setLoadingDados(false);
      setDadosInicializados(true);
      return;
    }
    setLoadingDados(true);
    try {
      const isAuxiliar = user.perfil === 'auxiliar_registro';
      const [atosData, escsData, despesasRegistroData, rembs, pendenciasData, preferenciasData] = await Promise.all([
        isAuxiliar ? Promise.resolve([]) : api.getAtos(),
        isAuxiliar ? Promise.resolve([]) : api.getEscreventes(),
        ['admin', 'financeiro', 'chefe_financeiro', 'auxiliar_registro'].includes(user.perfil) ? api.getDespesasRegistro() : Promise.resolve([]),
        isAuxiliar ? Promise.resolve([]) : api.getReembolsos(),
        isAuxiliar ? Promise.resolve([]) : api.getPendencias({ status: 'todas' }),
        api.getPreferenciasUsuario(),
      ]);
      setAtos(sortAtos(atosData.map(normalizeAto)));
      setEscreventes(sortEscreventesByNome(escsData));
      setDespesasRegistro(sortDespesasRegistro(despesasRegistroData.map(normalizeDespesaRegistro)));
      setPagamentosReembolso(rembs.map(normalizeReembolso));
      setPendencias(pendenciasData);
      setPreferenciasUsuario(preferenciasData || {});
    } catch (e) {
      setErro('Erro ao carregar dados: ' + e.message);
    } finally {
      setLoadingDados(false);
      setDadosInicializados(true);
    }
  }, [user, normalizeAto, normalizeDespesaRegistro, normalizeReembolso]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleLogin  = (userData) => {
    setDadosInicializados(false);
    setErro('');
    setPreferenciasUsuario({});
    setUser(userData);
    setView(userData?.perfil === 'auxiliar_registro' ? 'despesas_registro' : 'dashboard');
    setModalSenha(userData?.precisa_trocar_senha === true);
  };
  const handleLogout = () => {
    localStorage.removeItem('cartorio_token');
    setUser(null); setAtos([]); setEscreventes([]); setDespesasRegistro([]); setPagamentosReembolso([]); setPendencias([]);
    setPreferenciasUsuario({});
    setView('dashboard');
    setDadosInicializados(false); setLoadingDados(false); setModalSenha(false); setErro('');
  };
  const handleSenhaAlterada = (data) => {
    if (data?.token) localStorage.setItem('cartorio_token', data.token);
    if (data?.user) setUser(data.user);
    setModalSenha(false);
    setDadosInicializados(false);
    setErro('');
  };

  const handleRefresh = async () => {
    if (view === 'importacoes') {
      setImportacoesRefreshKey(prev => prev + 1);
      return;
    }
    await carregarDados();
  };

  const salvarPreferenciasUsuario = useCallback(async (patch) => {
    const requestId = ++preferenciasRequestSeqRef.current;

    setPreferenciasUsuario((prev) => ({ ...prev, ...patch }));

    try {
      const persisted = await api.atualizarPreferenciasUsuario({ preferencias: patch });
      if (requestId === preferenciasRequestSeqRef.current) {
        setPreferenciasUsuario(persisted || {});
      }
      return persisted;
    } catch (e) {
      if (requestId === preferenciasRequestSeqRef.current) {
        setErro('Erro ao salvar preferências: ' + e.message);
      }
      throw e;
    }
  }, []);

  const persistirAto = async (form, options = {}) => {
    const { closeModal = true } = options;
    try {
      let ato;
      if (form.id && typeof form.id === 'number' && form.id < 1e12) {
        ato = normalizeAto(await api.atualizarAto(form.id, form));
        setAtos(prev => sortAtos(prev.map(a => a.id === ato.id ? ato : a)));
      } else {
        ato = normalizeAto(await api.criarAto(form));
        setAtos(prev => sortAtos([...prev, ato]));
      }
      const pendenciasAtualizadas = await api.getPendencias({ status: 'todas' });
      setPendencias(pendenciasAtualizadas);
      if (closeModal) setModalAto(null);
      else setModalAto(ato);
      return ato;
    } catch (e) { setErro('Erro ao salvar ato: ' + e.message); }
  };

  const salvarAto = async (form) => {
    await persistirAto(form, { closeModal: true });
  };

  const salvarAtoSemFechar = async (form) => {
    await persistirAto(form, { closeModal: false });
  };

  const salvarEscrevente = async (form) => {
    try {
      let esc;
      if (form.id) {
        esc = await api.atualizarEscrevente(form.id, form);
        setEscreventes(prev => sortEscreventesByNome(prev.map(e => e.id === esc.id ? esc : e)));
      } else {
        esc = await api.criarEscrevente(form);
        setEscreventes(prev => sortEscreventesByNome([...prev, esc]));
      }
      setModalEscrevente(null);
    } catch (e) { setErro('Erro ao salvar escrevente: ' + e.message); }
  };

  const handleManifestarPendencia = async (payload) => {
    const pendencia = await api.manifestarPendencia(payload);
    await carregarDados();
    return pendencia;
  };

  const handleAtualizarPendencia = async (pendenciaId, payload) => {
    const atualizada = await api.atualizarPendencia(pendenciaId, payload);
    setPendencias((prev) => prev.map((item) => item.id === atualizada.id ? atualizada : item));
    await carregarDados();
    return atualizada;
  };

  const handleOcultarPendencia = async (pendenciaId) => {
    await api.ocultarPendencia(pendenciaId);
    setPendencias((prev) => prev.filter((item) => item.id !== pendenciaId));
  };

  // ── Visibilidade de atos (backend já filtra; camada extra como segurança) ──
  const podeVerAto = (ato) => {
    if (['admin', 'financeiro', 'chefe_financeiro'].includes(userRole)) return true;
    if (!userId) return false;
    return [ato.captador_id, ato.executor_id, ato.signatario_id].includes(userId);
  };

  const escreventesById = useMemo(
    () => new Map(escreventes.map((item) => [item.id, item])),
    [escreventes]
  );
  const contestacoesReembolsoAbertas = useMemo(
    () => buildOpenReembolsoContestacoes({
      pendencias,
      pagamentosReembolso,
      escreventes,
    }),
    [pendencias, pagamentosReembolso, escreventes]
  );

  const atosFiltrados = useMemo(() => {
    let l = atos.filter(podeVerAto);
    if (busca) {
      l = l.filter((ato) => atoMatchesSearch(ato, busca, escreventesById));
    }
    return sortAtos(l);
  }, [atos, userRole, userId, escreventes, busca, escreventesById]);

  const escreventesOrdenados = useMemo(() => sortEscreventesByNome(escreventes), [escreventes]);

  const showContestacaoBadge = ['admin', 'financeiro', 'chefe_financeiro'].includes(userRole) && contestacoesReembolsoAbertas.length > 0;
  const navItems = isAuxiliarRegistro
    ? [{ key: 'despesas_registro', label: 'Registro', icon: '🧾' }]
    : [
        { key: 'dashboard',  label: 'Dashboard', icon: '📊' },
        { key: 'atos', label: 'Livros de Notas', icon: '📋' },
        ...(['admin', 'financeiro', 'chefe_financeiro'].includes(userRole) ? [{ key: 'importacoes', label: 'Importações', icon: '📤' }] : []),
        ...(canAccessRegistro ? [{ key: 'despesas_registro', label: 'Registro', icon: '🧾' }] : []),
        { key: 'relatorios', label: showContestacaoBadge ? `Relatórios (${contestacoesReembolsoAbertas.length})` : 'Relatórios', icon: '📈' },
        ...(userRole === 'admin' ? [{ key: 'escreventes', label: 'Escreventes', icon: '👥' }, { key: 'usuarios', label: 'Usuários', icon: '🔑' }] : []),
      ];

  useEffect(() => {
    if (view !== 'relatorios') {
      setRelatoriosInitialTab(null);
    }
  }, [view]);

  const abrirRelatoriosNaAba = useCallback((tab) => {
    setRelatoriosInitialTab(tab);
    setView('relatorios');
  }, []);

  // ── Render: loading / login ──────────────────────────────────────────────────
  if (loadingApp) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#1e3a5f,#152b47)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
      Carregando...
    </div>
  );
  if (!user) return <TelaLogin onLogin={handleLogin} />;
  if (precisaTrocarSenha) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#1e3a5f,#152b47)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Segui UI',system-ui,sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 520, background: '#fff', borderRadius: 20, padding: 32, boxShadow: '0 20px 60px #00000040' }}>
        <div style={{ color: '#1e3a5f', fontSize: 24, fontWeight: 800, marginBottom: 10 }}>Troca obrigatória de senha</div>
        <div style={{ color: '#475569', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
          O acesso de <strong>{user.email}</strong> está liberado apenas para a troca da senha inicial. Depois disso, o sistema carrega normalmente.
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => setModalSenha(true)} style={{ background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 18px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            Abrir troca de senha
          </button>
          <button onClick={handleLogout} style={{ background: '#fff', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 18px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            Sair
          </button>
        </div>
      </div>
      {modalSenha && (
        <ModalTrocarSenha
          forced
          onClose={() => setModalSenha(false)}
          onSuccess={handleSenhaAlterada}
        />
      )}
    </div>
  );

  // ── Render principal ─────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Segui UI',system-ui,sans-serif" }}>

      {/* Sidebar */}
      <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: 235, background: 'linear-gradient(180deg,#1e3a5f,#152b47)', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
        <div style={{ padding: '20px 16px', borderBottom: '2px solid #e8edf5', background: '#fff', display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/logo.png" alt="Logo" style={{ width: 50, height: 50, objectFit: 'contain' }} />
          <div>
            <div style={{ color: '#64748b', fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>Cartório de Notas</div>
            <div style={{ color: '#1e3a5f', fontSize: 14, fontWeight: 800, marginTop: 2, lineHeight: 1.2 }}>Gestão Financeira</div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: '14px 10px' }}>
          {navItems.map(item => (
            <button key={item.key} onClick={() => { if (item.key === 'relatorios') setRelatoriosInitialTab(null); setView(item.key); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', marginBottom: 3, textAlign: 'left', background: view === item.key ? '#ffffff1a' : 'transparent', color: view === item.key ? '#fff' : '#94a3b8', fontWeight: view === item.key ? 700 : 500, fontSize: 14 }}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: '14px 10px', borderTop: '1px solid #ffffff18' }}>
          <div style={{ padding: '10px 14px', borderRadius: 10, background: '#ffffff15', marginBottom: 8 }}>
            <div style={{ color: '#93c5fd', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              {({ admin: '👑 Admin', financeiro: '💼 Financeiro', chefe_financeiro: '🎯 Chefe Financeiro', escrevente: '✍️ Escrevente', auxiliar_registro: '🧾 Auxiliar de Registro' })[userRole]}
            </div>
            <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.nome}</div>
          </div>
          <button onClick={() => setModalSenha(true)} style={{ width: '100%', padding: '8px 14px', border: 'none', borderRadius: 8, background: 'transparent', color: '#94a3b8', cursor: 'pointer', textAlign: 'left', fontSize: 13, marginBottom: 3 }}>🔒 Trocar senha</button>
          <button onClick={handleLogout} style={{ width: '100%', padding: '8px 14px', border: 'none', borderRadius: 8, background: 'transparent', color: '#f87171', cursor: 'pointer', textAlign: 'left', fontSize: 13, fontWeight: 600 }}>↩ Sair</button>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div style={{ marginLeft: 235, padding: 28, minHeight: '100vh' }}>
        {erro && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 18, color: '#dc2626', fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            ⚠️ {erro}
            <button onClick={() => setErro('')} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 18 }}>✕</button>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, color: '#1e293b', fontSize: 22, fontWeight: 800 }}>
              {{ dashboard: 'Dashboard', atos: 'Livros de Notas', importacoes: 'Importações', despesas_registro: 'Despesas de Registro', relatorios: 'Relatórios', escreventes: 'Escreventes', usuarios: 'Usuários' }[view]}
            </h1>
            <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 2 }}>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={handleRefresh} title="Recarregar dados" style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 16 }}>🔄</button>
            {view === 'atos' && ['admin', 'financeiro', 'chefe_financeiro'].includes(userRole) && (
              <button onClick={() => setModalAto('novo')} style={{ background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>＋ Novo Ato</button>
            )}
            {view === 'atos' && userRole === 'escrevente' && (
              <button onClick={() => setModalManifestarPendencia(true)} style={{ background: '#eff6ff', color: '#1d4ed8', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>⚠️ Manifestar Pendência</button>
            )}
            {view === 'escreventes' && userRole === 'admin' && (
              <button onClick={() => setModalEscrevente({ nome: '', taxa: 6, cargo: '', email: '', compartilhar_com: [], taxas_historico: [], taxa_vigencia_inicio: new Date().toISOString().slice(0, 10) })} style={{ background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>＋ Novo Escrevente</button>
            )}
          </div>
        </div>

        {!dadosInicializados ? (
          <div style={{ minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 15, fontWeight: 600 }}>
            Carregando dados...
          </div>
        ) : (
          <>
            {view === 'dashboard'  && (
              <Dashboard
                atos={atos}
                escreventes={escreventesOrdenados}
                contestacoesReembolsoAbertas={['admin', 'financeiro', 'chefe_financeiro'].includes(userRole) ? contestacoesReembolsoAbertas : []}
                onOpenContestacoesReembolso={() => abrirRelatoriosNaAba('reembolsos')}
              />
            )}

            {view === 'atos' && (
              <Atos
                atos={atosFiltrados}
                escreventes={escreventesOrdenados}
                userRole={userRole}
                userId={userId}
                userStorageKey={user?.id || userRole}
                preferredColumns={preferenciasUsuario.livros_notas_colunas}
                onSavePreferredColumns={(colunas) => salvarPreferenciasUsuario({ livros_notas_colunas: colunas })}
                onOpenAto={a => setModalAto(a)}
                busca={busca}
                onBusca={setBusca}
              />
            )}

            {view === 'importacoes' && ['admin', 'financeiro', 'chefe_financeiro'].includes(userRole) && (
              <Importacoes
                refreshKey={importacoesRefreshKey}
                onImportSuccess={carregarDados}
                onErro={setErro}
              />
            )}

            {view === 'despesas_registro' && canAccessRegistro && (
              <DespesasRegistro
                despesas={despesasRegistro}
                atos={atos}
                onCreate={async (payload) => {
                  try {
                    const nova = normalizeDespesaRegistro(await api.criarDespesaRegistro(payload));
                    setDespesasRegistro((prev) => sortDespesasRegistro([nova, ...prev]));
                    return nova;
                  } catch (e) {
                    setErro(e.message);
                    throw e;
                  }
                }}
                onUpdate={async (id, payload) => {
                  try {
                    const atualizada = normalizeDespesaRegistro(await api.atualizarDespesaRegistro(id, payload));
                    setDespesasRegistro((prev) => sortDespesasRegistro(prev.map((item) => (item.id === atualizada.id ? atualizada : item))));
                    return atualizada;
                  } catch (e) {
                    setErro(e.message);
                    throw e;
                  }
                }}
                onDelete={async (id) => {
                  try {
                    await api.deletarDespesaRegistro(id);
                    setDespesasRegistro((prev) => prev.filter((item) => item.id !== id));
                  } catch (e) {
                    setErro(e.message);
                    throw e;
                  }
                }}
              />
            )}

            {view === 'relatorios' && (
              <Relatorios
                atos={atos}
                escreventes={escreventesOrdenados}
                pendencias={pendencias}
                pagamentosReembolso={pagamentosReembolso}
                userRole={userRole}
                userId={userId}
                initialTab={relatoriosInitialTab}
                contestacoesReembolsoAbertas={contestacoesReembolsoAbertas}
                userStorageKey={user?.id || userRole}
                preferredAtosColumns={preferenciasUsuario.relatorios_atos_colunas}
                onSavePreferredAtosColumns={(colunas) => salvarPreferenciasUsuario({ relatorios_atos_colunas: colunas })}
                onOpenAto={(ato) => setModalAto(ato)}
                onAtualizarPendencia={async (id, payload) => { try { return await handleAtualizarPendencia(id, payload); } catch (e) { setErro(e.message); throw e; } }}
                onOcultarPendencia={async (id) => { try { await handleOcultarPendencia(id); } catch (e) { setErro(e.message); throw e; } }}
                onAddPagamento={async p => { try { const novo = normalizeReembolso(await api.criarReembolso(p)); setPagamentosReembolso(prev => [...prev, novo]); } catch (e) { setErro(e.message); } }}
                onConfirmarReembolso={async id => {
                  try {
                    const atualizado = normalizeReembolso(await api.confirmarReembolso(id));
                    setPagamentosReembolso(prev => prev.map(p => p.id === atualizado.id ? atualizado : p));
                    const pendenciasAtualizadas = await api.getPendencias({ status: 'todas' });
                    setPendencias(pendenciasAtualizadas);
                  } catch (e) { setErro(e.message); }
                }}
                onContestarReembolso={async (id, justificativa) => {
                  try {
                    const atualizado = normalizeReembolso(await api.contestarReembolso(id, justificativa));
                    setPagamentosReembolso(prev => prev.map(p => p.id === atualizado.id ? atualizado : p));
                    const pendenciasAtualizadas = await api.getPendencias({ status: 'todas' });
                    setPendencias(pendenciasAtualizadas);
                  } catch (e) { setErro(e.message); }
                }}
              />
            )}

            {view === 'escreventes' && (
              <Escreventes
                escreventes={escreventesOrdenados}
                atos={atos}
                userRole={userRole}
                onEditar={e => setModalEscrevente(e)}
              />
            )}

            {view === 'usuarios' && userRole === 'admin' && <PainelUsuarios escreventes={escreventesOrdenados} />}
          </>
        )}
      </div>

      {/* Modais */}
      {modalAto && (
        <ModalAto
          ato={modalAto === 'novo' ? null : modalAto}
          onClose={() => setModalAto(null)}
          onSave={salvarAto}
          onSaveStayOpen={salvarAtoSemFechar}
          escreventes={escreventesOrdenados}
          userRole={userRole}
          userId={userId}
        />
      )}
      {modalEscrevente && (
        <ModalEscrevente
          init={modalEscrevente}
          onClose={() => setModalEscrevente(null)}
          onSave={salvarEscrevente}
          todosEscreventes={escreventesOrdenados}
        />
      )}
      {modalManifestarPendencia && (
        <ModalManifestarPendencia
          onClose={() => setModalManifestarPendencia(false)}
          onSubmit={async (payload) => {
            try {
              await handleManifestarPendencia(payload);
              setModalManifestarPendencia(false);
            } catch (error) {
              throw error;
            }
          }}
        />
      )}
      {modalSenha && (
        <ModalTrocarSenha
          onClose={() => setModalSenha(false)}
          onSuccess={handleSenhaAlterada}
        />
      )}
    </div>
  );
}
