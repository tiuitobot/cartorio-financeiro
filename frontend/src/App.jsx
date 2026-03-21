import { useState, useMemo, useEffect, useCallback } from 'react';
import { api } from './api.js';
import { parseRef, padControle, toMoneyNumber } from './utils/format.js';
import { normalizeFormaPagamento } from './constants.js';

// Pages
import TelaLogin      from './pages/TelaLogin.jsx';
import Dashboard      from './pages/Dashboard.jsx';
import Atos           from './pages/Atos.jsx';
import Importacoes    from './pages/Importacoes.jsx';
import Relatorios     from './pages/Relatorios.jsx';
import Escreventes    from './pages/Escreventes.jsx';
import PainelUsuarios from './pages/PainelUsuarios.jsx';

// Modals
import ModalAto                  from './components/modals/ModalAto.jsx';
import ModalEscrevente           from './components/modals/ModalEscrevente.jsx';
import ModalDeclaroParticipacao  from './components/modals/ModalDeclaroParticipacao.jsx';
import ModalManifestarPendencia  from './components/modals/ModalManifestarPendencia.jsx';
import ModalRespostaCaptador     from './components/modals/ModalRespostaCaptador.jsx';
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

export default function App() {
  const [user, setUser]                           = useState(null);
  const [loadingApp, setLoadingApp]               = useState(true);
  const [loadingDados, setLoadingDados]           = useState(false);
  const [dadosInicializados, setDadosInicializados] = useState(false);
  const [atos, setAtos]                           = useState([]);
  const [escreventes, setEscreventes]             = useState([]);
  const [pagamentosReembolso, setPagamentosReembolso] = useState([]);
  const [pendencias, setPendencias]               = useState([]);
  const [reivindicacoes, setReivindicacoes]       = useState([]);
  const [view, setView]                           = useState('dashboard');
  const [modalAto, setModalAto]                   = useState(null);
  const [modalEscrevente, setModalEscrevente]     = useState(null);
  const [modalDeclaro, setModalDeclaro]           = useState(false);
  const [modalManifestarPendencia, setModalManifestarPendencia] = useState(false);
  const [modalRespostaCaptador, setModalRespostaCaptador] = useState(null);
  const [modalSenha, setModalSenha]               = useState(false);
  const [busca, setBusca]                         = useState('');
  const [erro, setErro]                           = useState('');
  const [importacoesRefreshKey, setImportacoesRefreshKey] = useState(0);

  const userRole = user?.perfil || 'escrevente';
  const userId   = user?.escrevente_id || null;

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

  // ── Autenticação ao iniciar ──────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('cartorio_token');
    if (!token) { setLoadingApp(false); return; }
    api.me().then(u => setUser(u)).catch(() => {
      localStorage.removeItem('cartorio_token');
    }).finally(() => setLoadingApp(false));
  }, []);

  // ── Carregar dados ───────────────────────────────────────────────────────────
  const carregarDados = useCallback(async () => {
    if (!user) return;
    setLoadingDados(true);
    try {
      const [atosData, escsData, rembs, reivs, pendenciasData] = await Promise.all([
        api.getAtos(),
        api.getEscreventes(),
        api.getReembolsos(),
        api.getReivindicacoes(),
        api.getPendencias({ status: 'todas' }),
      ]);
      setAtos(sortAtos(atosData.map(normalizeAto)));
      setEscreventes(sortEscreventesByNome(escsData));
      setPagamentosReembolso(rembs.map(normalizeReembolso));
      setReivindicacoes(reivs);
      setPendencias(pendenciasData);
    } catch (e) {
      setErro('Erro ao carregar dados: ' + e.message);
    } finally {
      setLoadingDados(false);
      setDadosInicializados(true);
    }
  }, [user, normalizeAto, normalizeReembolso]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleLogin  = (userData) => {
    setDadosInicializados(false);
    setUser(userData);
  };
  const handleLogout = () => {
    localStorage.removeItem('cartorio_token');
    setUser(null); setAtos([]); setEscreventes([]); setPagamentosReembolso([]); setPendencias([]); setReivindicacoes([]);
    setDadosInicializados(false); setLoadingDados(false);
  };

  const handleRefresh = async () => {
    if (view === 'importacoes') {
      setImportacoesRefreshKey(prev => prev + 1);
      return;
    }
    await carregarDados();
  };

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

  const handleDeclaro = async (reiv) => {
    try {
      const nova = await api.criarReivindicacao(reiv);
      setReivindicacoes(prev => [...prev, nova]);
      setModalDeclaro(false);
    } catch (e) { setErro(e.message); }
  };

  const handleRespostaCaptador = async (reivAtualizada) => {
    try {
      const atualizada = await api.atualizarReivindicacao(reivAtualizada.id, reivAtualizada);
      setReivindicacoes(prev => prev.map(r => r.id === atualizada.id ? atualizada : r));
      if (reivAtualizada.status === 'aceita') await carregarDados();
      setModalRespostaCaptador(null);
    } catch (e) { setErro(e.message); }
  };

  const handleContestarRecusa = async (reivId) => {
    try {
      const atualizada = await api.atualizarReivindicacao(reivId, { status: 'contestada' });
      setReivindicacoes(prev => prev.map(r => r.id === atualizada.id ? atualizada : r));
    } catch (e) { setErro(e.message); }
  };

  const handleDecisaoFinanceiro = async (reivId, aceitar) => {
    const status = aceitar ? 'aceita_financeiro' : 'negada_financeiro';
    try {
      const atualizada = await api.atualizarReivindicacao(reivId, { status, decisao_financeiro: aceitar ? 'Aceita pelo Financeiro' : 'Negada pelo Financeiro' });
      setReivindicacoes(prev => prev.map(r => r.id === atualizada.id ? atualizada : r));
      if (aceitar) await carregarDados();
    } catch (e) { setErro(e.message); }
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

  // ── Visibilidade de atos (C1: backend já filtra para escrevente; workaround mantido como camada extra) ──
  const podeVerAto = (ato) => {
    if (['admin', 'financeiro', 'chefe_financeiro'].includes(userRole)) return true;
    if (!userId) return false;
    if ([ato.captador_id, ato.executor_id, ato.signatario_id].includes(userId)) return true;
    const esc = escreventes.find(e => e.id === userId);
    return (esc?.compartilhar_com || []).some(cid => [ato.captador_id, ato.executor_id, ato.signatario_id].includes(cid));
  };

  const atosFiltrados = useMemo(() => {
    let l = atos.filter(podeVerAto);
    if (busca) {
      const ref = parseRef(busca);
      if (ref) { l = l.filter(a => parseInt(a.livro) === ref.livro && parseInt(a.pagina) === ref.pagina); }
      else { const b = busca.toLowerCase(); l = l.filter(a => padControle(a.controle).includes(b) || a.controle.includes(b)); }
    }
    return sortAtos(l);
  }, [atos, userRole, userId, escreventes, busca]);

  const escreventesOrdenados = useMemo(() => sortEscreventesByNome(escreventes), [escreventes]);

  const navItems = [
    { key: 'dashboard',  label: 'Dashboard',       icon: '📊' },
    { key: 'atos',       label: 'Livros de Notas',  icon: '📋' },
    ...(['admin', 'financeiro', 'chefe_financeiro'].includes(userRole) ? [{ key: 'importacoes', label: 'Importações', icon: '📤' }] : []),
    { key: 'relatorios', label: 'Relatórios',       icon: '📈' },
    ...(userRole === 'admin' ? [{ key: 'escreventes', label: 'Escreventes', icon: '👥' }, { key: 'usuarios', label: 'Usuários', icon: '🔑' }] : []),
  ];

  // ── Render: loading / login ──────────────────────────────────────────────────
  if (loadingApp) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#1e3a5f,#152b47)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
      Carregando...
    </div>
  );
  if (!user) return <TelaLogin onLogin={handleLogin} />;

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
            <button key={item.key} onClick={() => setView(item.key)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', marginBottom: 3, textAlign: 'left', background: view === item.key ? '#ffffff1a' : 'transparent', color: view === item.key ? '#fff' : '#94a3b8', fontWeight: view === item.key ? 700 : 500, fontSize: 14 }}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: '14px 10px', borderTop: '1px solid #ffffff18' }}>
          <div style={{ padding: '10px 14px', borderRadius: 10, background: '#ffffff15', marginBottom: 8 }}>
            <div style={{ color: '#93c5fd', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              {({ admin: '👑 Admin', financeiro: '💼 Financeiro', chefe_financeiro: '🎯 Chefe Financeiro', escrevente: '✍️ Escrevente' })[userRole]}
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
              {{ dashboard: 'Dashboard', atos: 'Livros de Notas', importacoes: 'Importações', relatorios: 'Relatórios', escreventes: 'Escreventes', usuarios: 'Usuários' }[view]}
            </h1>
            <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 2 }}>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={handleRefresh} title="Recarregar dados" style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 16 }}>🔄</button>
            {view === 'atos' && ['admin', 'financeiro', 'chefe_financeiro'].includes(userRole) && (
              <button onClick={() => setModalAto('novo')} style={{ background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>＋ Novo Ato</button>
            )}
            {view === 'atos' && userRole === 'escrevente' && (
              <>
                <button onClick={() => setModalManifestarPendencia(true)} style={{ background: '#eff6ff', color: '#1d4ed8', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>⚠️ Manifestar Pendência</button>
                <button onClick={() => setModalDeclaro(true)} style={{ background: '#fef3c7', color: '#92400e', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>📝 Declaro Participação</button>
              </>
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
            {view === 'dashboard'  && <Dashboard atos={atos} escreventes={escreventesOrdenados} />}

            {view === 'atos' && (
              <Atos
                atos={atosFiltrados}
                escreventes={escreventesOrdenados}
                reivindicacoes={reivindicacoes}
                userRole={userRole}
                userId={userId}
                userStorageKey={user?.id || userRole}
                onOpenAto={a => setModalAto(a)}
                onDeclaro={() => setModalDeclaro(true)}
                onRespostaCaptador={r => setModalRespostaCaptador(r)}
                onContestar={handleContestarRecusa}
                onDecisaoFinanceiro={handleDecisaoFinanceiro}
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

            {view === 'relatorios' && (
              <Relatorios
                atos={atos}
                escreventes={escreventesOrdenados}
                pendencias={pendencias}
                pagamentosReembolso={pagamentosReembolso}
                userRole={userRole}
                userId={userId}
                onOpenAto={(ato) => setModalAto(ato)}
                onAtualizarPendencia={async (id, payload) => { try { return await handleAtualizarPendencia(id, payload); } catch (e) { setErro(e.message); throw e; } }}
                onOcultarPendencia={async (id) => { try { await handleOcultarPendencia(id); } catch (e) { setErro(e.message); throw e; } }}
                onAddPagamento={async p => { try { const novo = normalizeReembolso(await api.criarReembolso(p)); setPagamentosReembolso(prev => [...prev, novo]); } catch (e) { setErro(e.message); } }}
                onConfirmarReembolso={async id => { try { const atualizado = normalizeReembolso(await api.confirmarReembolso(id)); setPagamentosReembolso(prev => prev.map(p => p.id === atualizado.id ? atualizado : p)); } catch (e) { setErro(e.message); } }}
                onContestarReembolso={async (id, justificativa) => { try { const atualizado = normalizeReembolso(await api.contestarReembolso(id, justificativa)); setPagamentosReembolso(prev => prev.map(p => p.id === atualizado.id ? atualizado : p)); } catch (e) { setErro(e.message); } }}
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
      {modalDeclaro && (
        <ModalDeclaroParticipacao
          userId={userId}
          atos={atos}
          escreventes={escreventes}
          onClose={() => setModalDeclaro(false)}
          onSubmit={handleDeclaro}
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
      {modalRespostaCaptador && (
        <ModalRespostaCaptador
          reiv={modalRespostaCaptador}
          escreventes={escreventes}
          onClose={() => setModalRespostaCaptador(null)}
          onSave={handleRespostaCaptador}
        />
      )}
      {modalSenha && <ModalTrocarSenha onClose={() => setModalSenha(false)} />}
    </div>
  );
}
