// Mock da camada de API para desenvolvimento local sem backend.
// Ativado via VITE_USE_MOCK=true no .env.local
// NÃO incluir em produção.

import {
  MOCK_ESCREVENTES, MOCK_ATOS, MOCK_DESPESAS_REGISTRO,
  MOCK_REEMBOLSOS, MOCK_REIVINDICACOES, MOCK_USUARIOS,
} from './data.js';

const delay = (ms = 180) => new Promise(r => setTimeout(r, ms));

const ADMIN_FIN = ['admin', 'financeiro', 'chefe_financeiro'];
const REGISTRO_ROLES = [...ADMIN_FIN, 'auxiliar_registro'];
const TIMEZONE = 'America/Sao_Paulo';
const USER_PREFERENCE_DEFINITIONS = {
  livros_notas_colunas: [
    'controle',
    'referencia',
    'data',
    'tipo_ato',
    'captador',
    'executor',
    'signatario',
    'tomador',
    'emolumentos',
    'total',
    'pago',
    'status',
  ],
  relatorios_atos_colunas: [
    'data_ato',
    'controle',
    'livro',
    'pagina',
    'captador',
    'nome_tomador',
    'cap_pct',
    'executor',
    'exe_pct',
    'signatario',
    'sig_val',
    'total_recibo',
    'emolumentos',
    'repasses',
    'issqn',
    'total_com',
    'remb_tab',
    'remb_esc',
    'data_pgto',
    'valor_pago',
    'forma_pgto',
    'saldo',
    'status',
  ],
};

const toNumber = (value) => {
  const parsed = Number.parseFloat(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeNullableString = (value) => {
  const normalized = String(value || '').trim();
  return normalized || null;
};

const normalizeControleRef = (value) => String(value || '').replace(/\D/g, '').padStart(5, '0');

function enrichDespesaRegistro(item) {
  const controleRef = normalizeControleRef(item.controle_ref);
  const ato = _atos.find((atoItem) => normalizeControleRef(atoItem.controle) === controleRef) || null;
  const atoDataPagamento = ato?.data_pagamento || null;
  const despesaAposPagamento = Boolean(
    ato
    && atoDataPagamento
    && item.data_registro
    && item.data_registro >= atoDataPagamento
  );

  let impactoFinanceiro = 'sem_ato_vinculado';
  if (ato && !atoDataPagamento) impactoFinanceiro = 'ato_sem_pagamento';
  else if (despesaAposPagamento) impactoFinanceiro = 'apos_pagamento_sem_recalculo';
  else if (ato) impactoFinanceiro = 'antes_do_pagamento';

  return {
    ...item,
    ato_vinculado_id: ato?.id || null,
    ato_vinculado_livro: ato?.livro || null,
    ato_vinculado_pagina: ato?.pagina || null,
    ato_vinculado_status: ato?.status || null,
    ato_vinculado_data_pagamento: atoDataPagamento,
    despesa_apos_pagamento: despesaAposPagamento,
    preserva_status_ato: despesaAposPagamento && ['pago', 'pago_menor', 'pago_maior'].includes(String(ato?.status || '')),
    impacto_financeiro: impactoFinanceiro,
  };
}

const formatDatePtBr = (date = new Date()) => new Intl.DateTimeFormat('pt-BR', {
  timeZone: TIMEZONE,
}).format(date);

function normalizePreferenceSelection(value, allowedKeys) {
  if (!Array.isArray(value)) return null;

  const allowedSet = new Set(allowedKeys);
  const seen = new Set();
  const normalized = [];

  for (const item of value) {
    if (typeof item !== 'string') continue;
    const key = item.trim();
    if (!allowedSet.has(key) || seen.has(key)) continue;
    seen.add(key);
    normalized.push(key);
  }

  return normalized;
}

function sanitizeUserPreferences(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};

  const sanitized = {};
  for (const [key, allowedKeys] of Object.entries(USER_PREFERENCE_DEFINITIONS)) {
    if (!Object.prototype.hasOwnProperty.call(input, key)) continue;
    const normalized = normalizePreferenceSelection(input[key], allowedKeys);
    if (normalized !== null) {
      sanitized[key] = normalized;
    }
  }

  return sanitized;
}

const calcStatus = (emolumentos, repasses, issqn, rembTab, rembEsc, valorPago) => {
  const total = toNumber(emolumentos)
    + toNumber(repasses)
    + toNumber(issqn)
    + toNumber(rembTab)
    + toNumber(rembEsc);
  const pago = toNumber(valorPago);

  if (pago <= 0) return 'pendente';
  if (pago < total - 0.005) return 'pago_menor';
  if (pago > total + 0.005) return 'pago_maior';
  return 'pago';
};

const totalAto = (ato) => (
  toNumber(ato.emolumentos)
  + toNumber(ato.repasses)
  + toNumber(ato.issqn)
  + toNumber(ato.reembolso_tabeliao)
  + toNumber(ato.reembolso_escrevente)
);

const reembolsoDevidoEscrevente = (ato) => {
  const reembolsoEscrevente = toNumber(ato.reembolso_escrevente);
  const valorPago = toNumber(ato.valor_pago);

  if (reembolsoEscrevente <= 0 || valorPago <= 0) return 0;

  const prioridade = toNumber(ato.emolumentos)
    + toNumber(ato.repasses)
    + toNumber(ato.issqn)
    + toNumber(ato.reembolso_tabeliao);
  const sobra = valorPago - prioridade;

  if (sobra <= 0) return 0;
  return Math.min(sobra, reembolsoEscrevente);
};

function normalizeOverride(override) {
  if (!Array.isArray(override) || !override.length) return null;
  return override.map((item) => ({
    escrevente_id: item.escrevente_id ?? item.escrevente?.id ?? null,
    nome: item.nome ?? item.escrevente?.nome ?? null,
    papel: item.papel ?? null,
    pct: item.pct ?? null,
    fixo: toNumber(item.fixo),
    total: toNumber(item.total),
  }));
}

function calcularComissoes(ato) {
  const override = normalizeOverride(ato.comissao_override);
  if (override) return override;
  if (!ato.captador_id) return [];

  const captador = findEscrevente(ato.captador_id);
  const executor = ato.executor_id ? findEscrevente(ato.executor_id) : null;
  const signatario = ato.signatario_id ? findEscrevente(ato.signatario_id) : null;

  if (!captador?.nome || !captador?.taxa) return [];

  const base = toNumber(ato.emolumentos);
  const temExecutor = Boolean(executor);
  const temSignatario = Boolean(signatario);
  const valorSignatario = 20;
  const resultado = [];

  if (captador.taxa === 30) {
    const percentualCaptador = temExecutor ? 24 : 30;
    let valorCaptador = (base * percentualCaptador) / 100;
    if (temSignatario) valorCaptador -= valorSignatario;

    resultado.push({
      escrevente_id: captador.id,
      nome: captador.nome,
      papel: 'Captador',
      pct: percentualCaptador,
      fixo: temSignatario ? -valorSignatario : 0,
      total: Math.max(0, valorCaptador),
    });
    if (temExecutor) {
      resultado.push({
        escrevente_id: executor.id,
        nome: executor.nome,
        papel: 'Executor',
        pct: 6,
        fixo: 0,
        total: (base * 6) / 100,
      });
    }
    if (temSignatario) {
      resultado.push({
        escrevente_id: signatario.id,
        nome: signatario.nome,
        papel: 'Signatário',
        pct: null,
        fixo: valorSignatario,
        total: valorSignatario,
      });
    }
    return resultado;
  }

  if (captador.taxa === 20) {
    let valorCaptador = (base * 20) / 100;
    if (temSignatario) valorCaptador -= valorSignatario;

    resultado.push({
      escrevente_id: captador.id,
      nome: captador.nome,
      papel: 'Captador',
      pct: 20,
      fixo: temSignatario ? -valorSignatario : 0,
      total: Math.max(0, valorCaptador),
    });
    if (temExecutor) {
      resultado.push({
        escrevente_id: executor.id,
        nome: executor.nome,
        papel: 'Executor',
        pct: 6,
        fixo: 0,
        total: (base * 6) / 100,
      });
    }
    if (temSignatario) {
      resultado.push({
        escrevente_id: signatario.id,
        nome: signatario.nome,
        papel: 'Signatário',
        pct: null,
        fixo: valorSignatario,
        total: valorSignatario,
      });
    }
    return resultado;
  }

  resultado.push({
    escrevente_id: captador.id,
    nome: captador.nome,
    papel: 'Captador',
    pct: 6,
    fixo: 0,
    total: (base * 6) / 100,
  });
  if (temExecutor) {
    resultado.push({
      escrevente_id: executor.id,
      nome: executor.nome,
      papel: 'Executor',
      pct: 6,
      fixo: 0,
      total: (base * 6) / 100,
    });
  }
  if (temSignatario) {
    resultado.push({
      escrevente_id: signatario.id,
      nome: signatario.nome,
      papel: 'Signatário',
      pct: null,
      fixo: valorSignatario,
      total: valorSignatario,
    });
  }
  return resultado;
}

function resolveVerificationStamp(nextVerifiedBy, previousAto) {
  const verifiedBy = normalizeNullableString(nextVerifiedBy);
  if (!verifiedBy) return null;

  if (
    previousAto
    && previousAto.verificado_por === verifiedBy
    && previousAto.verificado_em
  ) {
    return previousAto.verificado_em;
  }

  return formatDatePtBr();
}

function normalizeCorrecoes(correcoes = [], previousCorrecoes = []) {
  const previousById = new Map(previousCorrecoes.map((item) => [String(item.id), item]));

  return correcoes.map((correcao) => {
    const previous = previousById.get(String(correcao.id));
    return {
      id: correcao.id || nextId(),
      autor: normalizeNullableString(correcao.autor) || 'Financeiro',
      autor_id: correcao.autor_id ?? null,
      mensagem: correcao.mensagem || correcao.msg,
      data: previous?.data || formatDatePtBr(),
      status: correcao.status || 'aguardando',
    };
  });
}

function normalizeAtoInput(payload, previousAto = null) {
  const emolumentos = toNumber(payload.emolumentos);
  const repasses = toNumber(payload.repasses);
  const issqn = toNumber(payload.issqn);
  const reembolsoTabeliao = toNumber(payload.reembolso_tabeliao);
  const reembolsoEscrevente = toNumber(payload.reembolso_escrevente);
  const valorPago = toNumber(payload.valor_pago);
  const verificadoPor = normalizeNullableString(payload.verificado_por);

  return {
    ...previousAto,
    ...payload,
    controle: String(payload.controle || '').replace(/\D/g, '').padStart(5, '0'),
    livro: String(Number.parseInt(payload.livro, 10) || 0),
    pagina: String(Number.parseInt(payload.pagina, 10) || 0),
    data_ato: normalizeNullableString(payload.data_ato),
    captador_id: payload.captador_id ? Number.parseInt(payload.captador_id, 10) : null,
    executor_id: payload.executor_id ? Number.parseInt(payload.executor_id, 10) : null,
    signatario_id: payload.signatario_id ? Number.parseInt(payload.signatario_id, 10) : null,
    emolumentos,
    repasses,
    issqn,
    reembolso_tabeliao: reembolsoTabeliao,
    reembolso_escrevente: reembolsoEscrevente,
    escrevente_reembolso_id: reembolsoEscrevente > 0 && payload.escrevente_reembolso_id
      ? Number.parseInt(payload.escrevente_reembolso_id, 10)
      : null,
    valor_pago: valorPago,
    data_pagamento: normalizeNullableString(payload.data_pagamento),
    forma_pagamento: normalizeNullableString(payload.forma_pagamento),
    status: calcStatus(emolumentos, repasses, issqn, reembolsoTabeliao, reembolsoEscrevente, valorPago),
    verificado_por: verificadoPor,
    verificado_em: resolveVerificationStamp(verificadoPor, previousAto),
    comissao_override: Array.isArray(payload.comissao_override) && payload.comissao_override.length
      ? payload.comissao_override.map((item) => ({ ...item }))
      : null,
    notas: normalizeNullableString(payload.notas),
    correcoes: normalizeCorrecoes(payload.correcoes || [], previousAto?.correcoes || []),
  };
}

function validateAtoPayload(ato) {
  if (ato.controle === '00000') throw new Error('Controle é obrigatório');
  if (ato.livro === '0') throw new Error('Livro é obrigatório');
  if (ato.pagina === '0') throw new Error('Página é obrigatória');

  const moneyFields = [
    ['emolumentos', ato.emolumentos],
    ['repasses', ato.repasses],
    ['issqn', ato.issqn],
    ['reembolso_tabeliao', ato.reembolso_tabeliao],
    ['reembolso_escrevente', ato.reembolso_escrevente],
    ['valor_pago', ato.valor_pago],
  ];

  const invalidField = moneyFields.find(([, value]) => value < 0);
  if (invalidField) throw new Error(`Campo inválido: ${invalidField[0]} não pode ser negativo`);

  if (ato.reembolso_escrevente > 0 && !ato.escrevente_reembolso_id) {
    throw new Error('Selecione o escrevente que receberá o reembolso');
  }
}

function assertAtoUnico(ato, currentId = null) {
  if (ato.controle !== '00000') {
    const duplicateControle = _atos.find((item) => item.id !== currentId && item.controle === ato.controle);
    if (duplicateControle) throw new Error('Já existe um ato com este controle');
  }

  if (ato.livro !== '0' && ato.pagina !== '0') {
    const duplicateRef = _atos.find((item) => item.id !== currentId && item.livro === ato.livro && item.pagina === ato.pagina);
    if (duplicateRef) throw new Error('Já existe um ato para esta referência de livro e página');
  }
}

function findEscrevente(id) {
  return _escreventes.find((item) => item.id === id) || null;
}

function enrichAto(ato) {
  const captador = findEscrevente(ato.captador_id);
  const executor = findEscrevente(ato.executor_id);
  const signatario = findEscrevente(ato.signatario_id);
  const escreventeReembolso = findEscrevente(ato.escrevente_reembolso_id);

  return {
    ...ato,
    captador_nome: captador?.nome || null,
    captador_taxa: captador?.taxa || null,
    executor_nome: executor?.nome || null,
    executor_taxa: executor?.taxa || null,
    signatario_nome: signatario?.nome || null,
    signatario_taxa: signatario?.taxa || null,
    escrevente_reembolso_nome: escreventeReembolso?.nome || null,
    total: totalAto(ato),
    comissoes: calcularComissoes(ato),
    reembolso_devido_escrevente: reembolsoDevidoEscrevente(ato),
  };
}

function getCurrentUser() {
  const email = localStorage.getItem('mock_user_email')?.toLowerCase();
  return email ? (_usuarios.find((user) => user.email === email && user.ativo) || null) : null;
}

function requireUser() {
  const user = getCurrentUser();
  if (!user) throw new Error('Não autenticado');
  return user;
}

function requirePerfil(user, ...perfis) {
  if (!perfis.includes(user.perfil)) {
    throw new Error('Permissão insuficiente');
  }
}

function stripDerivedAto(ato) {
  const {
    total,
    comissoes,
    reembolso_devido_escrevente,
    captador_nome,
    captador_taxa,
    executor_nome,
    executor_taxa,
    signatario_nome,
    signatario_taxa,
    escrevente_reembolso_nome,
    ...rest
  } = ato;

  return {
    ...rest,
    correcoes: (rest.correcoes || []).map((correcao) => ({
      ...correcao,
      mensagem: correcao.mensagem || correcao.msg,
    })),
  };
}

function normalizeReembolso(reembolso) {
  return {
    id: reembolso.id,
    escrevente_id: reembolso.escrevente_id,
    data: reembolso.data,
    valor: toNumber(reembolso.valor),
    notas: reembolso.notas ?? reembolso.descricao ?? null,
    confirmado_escrevente: reembolso.confirmado_escrevente ?? reembolso.confirmado ?? false,
  };
}

// Estado mutável in-memory (persiste durante a sessão, reseta ao recarregar)
let _atos          = MOCK_ATOS.map(stripDerivedAto);
let _despesasRegistro = MOCK_DESPESAS_REGISTRO.map((item) => ({ ...item }));
let _escreventes   = MOCK_ESCREVENTES.map(e => ({ ...e }));
let _reembolsos    = MOCK_REEMBOLSOS.map(normalizeReembolso);
let _reivindicacoes = MOCK_REIVINDICACOES.map(r => ({ ...r }));
let _usuarios      = MOCK_USUARIOS.map(u => ({ ...u }));
let _preferenciasUsuarios = new Map();
let _nextId        = 100;
const nextId       = () => ++_nextId;

export const apiMock = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  login: async (email, senha) => {
    await delay();
    const normalizedEmail = email.trim().toLowerCase();
    const user = _usuarios.find((item) => item.email === normalizedEmail && item.ativo);
    if (!user || senha.length < 6)
      throw new Error('E-mail ou senha inválidos');
    localStorage.setItem('cartorio_token', 'mock-token');
    localStorage.setItem('mock_user_email', normalizedEmail);
    return {
      token: 'mock-token',
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        perfil: user.perfil,
        escrevente_id: user.escrevente_id,
      },
    };
  },

  me: async () => {
    await delay(80);
    const u = getCurrentUser();
    if (!u) throw new Error('Não autenticado');
    return {
      id: u.id,
      nome: u.nome,
      email: u.email,
      perfil: u.perfil,
      escrevente_id: u.escrevente_id,
    };
  },

  getPreferenciasUsuario: async () => {
    await delay(80);
    const user = requireUser();
    return {
      ...sanitizeUserPreferences(_preferenciasUsuarios.get(user.id) || {}),
    };
  },

  atualizarPreferenciasUsuario: async (data = {}) => {
    await delay(80);
    const user = requireUser();
    const payload = data?.preferencias && typeof data.preferencias === 'object'
      ? data.preferencias
      : data;
    const atuais = sanitizeUserPreferences(_preferenciasUsuarios.get(user.id) || {});
    const proximas = {
      ...atuais,
      ...sanitizeUserPreferences(payload),
    };
    _preferenciasUsuarios.set(user.id, proximas);
    return { ...proximas };
  },

  trocarSenha: async (atual, nova) => {
    await delay();
    requireUser();
    if (atual.length < 6 || nova.length < 6) throw new Error('Senha mínima: 6 caracteres');
    return { ok: true };
  },

  // ── Escreventes ───────────────────────────────────────────────────────────
  getEscreventes: async () => {
    await delay();
    requirePerfil(requireUser(), 'admin', 'financeiro', 'chefe_financeiro', 'escrevente');
    return _escreventes.filter(e => e.ativo);
  },

  criarEscrevente: async (data) => {
    await delay();
    requirePerfil(requireUser(), 'admin');
    if (!data.nome || ![6, 20, 30].includes(Number.parseInt(data.taxa, 10))) {
      throw new Error('Nome e taxa (6, 20 ou 30) obrigatórios');
    }
    const novo = {
      id: nextId(),
      nome: data.nome,
      cargo: data.cargo || null,
      email: normalizeNullableString(data.email),
      taxa: Number.parseInt(data.taxa, 10),
      ativo: true,
      compartilhar_com: Array.isArray(data.compartilhar_com) ? [...data.compartilhar_com] : [],
    };
    _escreventes.push(novo);
    return { ...novo };
  },

  atualizarEscrevente: async (id, data) => {
    await delay();
    const user = requireUser();
    const idx = _escreventes.findIndex(e => e.id === id);
    if (idx === -1) throw new Error('Escrevente não encontrado');

    const isAdmin = user.perfil === 'admin';
    const isOwner = user.escrevente_id === id;
    if (!isAdmin && !isOwner) throw new Error('Permissão insuficiente');

    if (isAdmin) {
      _escreventes[idx] = {
        ..._escreventes[idx],
        nome: data.nome,
        cargo: data.cargo || null,
        email: normalizeNullableString(data.email),
        taxa: Number.parseInt(data.taxa, 10),
      };
    }

    _escreventes[idx] = {
      ..._escreventes[idx],
      compartilhar_com: Array.isArray(data.compartilhar_com) ? [...data.compartilhar_com] : [],
    };
    return { ..._escreventes[idx] };
  },

  // ── Atos ──────────────────────────────────────────────────────────────────
  getAtos: async () => {
    await delay();
    const u = requireUser();
    if (!u) throw new Error('Não autenticado');
    if (u.perfil === 'auxiliar_registro') throw new Error('Permissão insuficiente');
    if (u.perfil === 'escrevente' && u.escrevente_id) {
      const esc = _escreventes.find(e => e.id === u.escrevente_id);
      const ids = [u.escrevente_id, ...(esc?.compartilhar_com || [])];
      return _atos
        .filter(a => ids.some(id => [a.captador_id, a.executor_id, a.signatario_id].includes(id)))
        .map(enrichAto);
    }
    return _atos.map(enrichAto);
  },

  criarAto: async (data) => {
    await delay();
    requirePerfil(requireUser(), ...ADMIN_FIN);
    const novo = normalizeAtoInput(data);
    validateAtoPayload(novo);
    assertAtoUnico(novo);
    novo.id = nextId();
    _atos.push(novo);
    return enrichAto(novo);
  },

  atualizarAto: async (id, data) => {
    await delay();
    requirePerfil(requireUser(), ...ADMIN_FIN);
    const idx = _atos.findIndex(a => a.id === id);
    if (idx === -1) throw new Error('Ato não encontrado');
    const atualizado = normalizeAtoInput(data, _atos[idx]);
    validateAtoPayload(atualizado);
    assertAtoUnico(atualizado, id);
    atualizado.id = id;
    _atos[idx] = atualizado;
    return enrichAto(atualizado);
  },

  // ── Reembolsos ────────────────────────────────────────────────────────────
  getReembolsos: async () => {
    await delay();
    const user = requireUser();
    if (user.perfil === 'auxiliar_registro') throw new Error('Permissão insuficiente');
    if (user.perfil === 'escrevente') {
      if (!user.escrevente_id) throw new Error('Usuário não vinculado a escrevente');
      return _reembolsos.filter((item) => item.escrevente_id === user.escrevente_id).map((item) => ({ ...item }));
    }
    return _reembolsos.map((item) => ({ ...item }));
  },

  criarReembolso: async (data) => {
    await delay();
    requirePerfil(requireUser(), ...ADMIN_FIN);
    if (!data.escrevente_id || !data.data || !toNumber(data.valor)) {
      throw new Error('Campos obrigatórios');
    }
    const novo = {
      id: nextId(),
      escrevente_id: data.escrevente_id,
      data: data.data,
      valor: toNumber(data.valor),
      notas: normalizeNullableString(data.notas),
      confirmado_escrevente: false,
      contestado_escrevente: false,
      contestacao_justificativa: null,
    };
    _reembolsos.push(novo);
    return { ...novo };
  },

  confirmarReembolso: async (id) => {
    await delay();
    const user = requireUser();
    const idx = _reembolsos.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Reembolso não encontrado');
    const isAdmin = ADMIN_FIN.includes(user.perfil);
    const isOwner = user.escrevente_id === _reembolsos[idx].escrevente_id;
    if (!isAdmin && !isOwner) throw new Error('Permissão insuficiente');
    _reembolsos[idx] = {
      ..._reembolsos[idx],
      confirmado_escrevente: true,
      contestado_escrevente: false,
      contestacao_justificativa: null,
    };
    return { ..._reembolsos[idx] };
  },

  contestarReembolso: async (id, justificativa) => {
    await delay();
    const user = requireUser();
    const idx = _reembolsos.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Reembolso não encontrado');
    if (user.escrevente_id !== _reembolsos[idx].escrevente_id) throw new Error('Permissão insuficiente');
    if (!String(justificativa || '').trim()) throw new Error('Justificativa obrigatória');
    _reembolsos[idx] = {
      ..._reembolsos[idx],
      confirmado_escrevente: false,
      contestado_escrevente: true,
      contestacao_justificativa: String(justificativa).trim(),
    };
    return { ..._reembolsos[idx] };
  },

  // ── Despesas de Registro ──────────────────────────────────────────────────
  getDespesasRegistro: async () => {
    await delay();
    requirePerfil(requireUser(), ...REGISTRO_ROLES);
    return _despesasRegistro.map((item) => enrichDespesaRegistro(item));
  },

  criarDespesaRegistro: async (data) => {
    await delay();
    requirePerfil(requireUser(), ...REGISTRO_ROLES);
    if (!String(data?.controle_ref || '').trim()) throw new Error('Controle obrigatório');
    if (!String(data?.data_registro || '').trim()) throw new Error('Data do registro obrigatória');
    if (!toNumber(data?.valor)) throw new Error('Valor deve ser maior que zero');
    if (!String(data?.descricao || '').trim()) throw new Error('Descrição obrigatória');

    const novo = {
      id: nextId(),
      controle_ref: normalizeControleRef(data.controle_ref),
      data_registro: data.data_registro,
      valor: toNumber(data.valor),
      descricao: String(data.descricao).trim(),
      cartorio_nome: normalizeNullableString(data.cartorio_nome),
      protocolo: normalizeNullableString(data.protocolo),
      observacoes: normalizeNullableString(data.observacoes),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    _despesasRegistro.push(novo);
    return enrichDespesaRegistro(novo);
  },

  atualizarDespesaRegistro: async (id, data) => {
    await delay();
    requirePerfil(requireUser(), ...REGISTRO_ROLES);
    const idx = _despesasRegistro.findIndex((item) => item.id === id);
    if (idx === -1) throw new Error('Despesa de registro não encontrada');
    if (!String(data?.controle_ref || '').trim()) throw new Error('Controle obrigatório');
    if (!String(data?.data_registro || '').trim()) throw new Error('Data do registro obrigatória');
    if (!toNumber(data?.valor)) throw new Error('Valor deve ser maior que zero');
    if (!String(data?.descricao || '').trim()) throw new Error('Descrição obrigatória');

    _despesasRegistro[idx] = {
      ..._despesasRegistro[idx],
      controle_ref: normalizeControleRef(data.controle_ref),
      data_registro: data.data_registro,
      valor: toNumber(data.valor),
      descricao: String(data.descricao).trim(),
      cartorio_nome: normalizeNullableString(data.cartorio_nome),
      protocolo: normalizeNullableString(data.protocolo),
      observacoes: normalizeNullableString(data.observacoes),
      updated_at: new Date().toISOString(),
    };
    return enrichDespesaRegistro(_despesasRegistro[idx]);
  },

  deletarDespesaRegistro: async (id) => {
    await delay();
    requirePerfil(requireUser(), ...REGISTRO_ROLES);
    const idx = _despesasRegistro.findIndex((item) => item.id === id);
    if (idx === -1) throw new Error('Despesa de registro não encontrada');
    _despesasRegistro.splice(idx, 1);
    return null;
  },

  // ── Reivindicações ────────────────────────────────────────────────────────
  getReivindicacoes: async () => {
    await delay();
    const user = requireUser();
    if (user.perfil === 'auxiliar_registro') throw new Error('Permissão insuficiente');
    if (user.perfil === 'escrevente') {
      if (!user.escrevente_id) throw new Error('Usuário não vinculado a escrevente');
      return _reivindicacoes
        .filter((item) => {
          const ato = _atos.find((atoItem) => atoItem.id === item.ato_id);
          return item.escrevente_id === user.escrevente_id || ato?.captador_id === user.escrevente_id;
        })
        .map((item) => ({ ...item }));
    }
    return _reivindicacoes.map((item) => ({ ...item }));
  },

  criarReivindicacao: async (data) => {
    await delay();
    const u = requireUser();
    requirePerfil(u, 'escrevente');
    if (!u.escrevente_id) throw new Error('Usuário não vinculado a escrevente');

    const ato = _atos.find((item) => item.id === data.ato_id);
    if (!ato) throw new Error('Ato não encontrado');
    if (![ 'executor', 'signatario' ].includes(data.funcao)) throw new Error('Dados inválidos');
    if ([ato.captador_id, ato.executor_id, ato.signatario_id].includes(u.escrevente_id)) {
      throw new Error('Você já está registrado neste ato');
    }

    const esc = _escreventes.find(e => e.id === u.escrevente_id);
    const nova = {
      id: nextId(),
      ato_id: data.ato_id,
      funcao: data.funcao,
      escrevente_id: u.escrevente_id,
      escrevente_nome: esc?.nome || u.nome || '',
      status: 'pendente',
      justificativa: '',
      decisao_financeiro: '',
      data: formatDatePtBr(),
    };
    _reivindicacoes.push(nova);
    return { ...nova };
  },

  atualizarReivindicacao: async (id, data) => {
    await delay();
    const user = requireUser();
    const idx = _reivindicacoes.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Reivindicação não encontrada');
    const atual = _reivindicacoes[idx];
    const ato = _atos.find((item) => item.id === atual.ato_id);
    if (!ato) throw new Error('Ato não encontrado');

    if (data.status === 'aceita' || data.status === 'recusada') {
      const isCaptador = ato.captador_id === user.escrevente_id;
      const isAdmin = ADMIN_FIN.includes(user.perfil) || user.perfil === 'admin';
      if (!isCaptador && !isAdmin) throw new Error('Somente o captador pode responder');
      if (data.status === 'aceita') {
        const campo = atual.funcao === 'executor' ? 'executor_id' : 'signatario_id';
        ato[campo] = atual.escrevente_id;
      }
    }

    if (data.status === 'contestada' && user.escrevente_id !== atual.escrevente_id) {
      throw new Error('Permissão insuficiente');
    }

    if (data.status === 'aceita_financeiro' || data.status === 'negada_financeiro') {
      requirePerfil(user, 'admin', 'financeiro', 'chefe_financeiro');
      if (data.status === 'aceita_financeiro') {
        const campo = atual.funcao === 'executor' ? 'executor_id' : 'signatario_id';
        ato[campo] = atual.escrevente_id;
      }
    }

    _reivindicacoes[idx] = {
      ...atual,
      status: data.status,
      justificativa: data.justificativa ?? atual.justificativa,
      decisao_financeiro: data.decisao_financeiro ?? atual.decisao_financeiro,
    };
    return { ..._reivindicacoes[idx] };
  },

  // ── Pendências ────────────────────────────────────────────────────────────
  getPendencias: async () => {
    await delay();
    requirePerfil(requireUser(), 'admin', 'financeiro', 'chefe_financeiro', 'escrevente');
    return [];
  },

  manifestarPendencia: async () => {
    await delay();
    requirePerfil(requireUser(), 'escrevente');
    throw new Error('Manifestação de pendência indisponível no modo mock');
  },

  atualizarPendencia: async () => {
    await delay();
    requirePerfil(requireUser(), 'admin', 'financeiro', 'chefe_financeiro');
    throw new Error('Tratamento de pendência indisponível no modo mock');
  },

  ocultarPendencia: async () => {
    await delay();
    requirePerfil(requireUser(), 'admin', 'financeiro', 'chefe_financeiro');
    throw new Error('Ocultação de pendência indisponível no modo mock');
  },

  // ── Importações ────────────────────────────────────────────────────────────
  getImportacoes: async () => {
    await delay();
    requirePerfil(requireUser(), 'admin', 'financeiro', 'chefe_financeiro');
    return [];
  },

  getImportacao: async () => {
    await delay();
    requirePerfil(requireUser(), 'admin', 'financeiro', 'chefe_financeiro');
    throw new Error('Preview de importação indisponível no modo mock');
  },

  previewImportacao: async () => {
    await delay();
    requirePerfil(requireUser(), 'admin', 'financeiro', 'chefe_financeiro');
    throw new Error('Upload de planilha indisponível no modo mock');
  },

  importarLote: async () => {
    await delay();
    requirePerfil(requireUser(), 'admin', 'financeiro', 'chefe_financeiro');
    throw new Error('Importação definitiva indisponível no modo mock');
  },

  cancelarImportacao: async () => {
    await delay();
    requirePerfil(requireUser(), 'admin', 'financeiro', 'chefe_financeiro');
    throw new Error('Cancelamento de lote indisponível no modo mock');
  },

  deletarImportacao: async () => {
    await delay();
    requirePerfil(requireUser(), 'admin', 'financeiro', 'chefe_financeiro');
    throw new Error('Exclusão de lote indisponível no modo mock');
  },

  // ── Usuários ──────────────────────────────────────────────────────────────
  getUsuarios: async () => {
    await delay();
    requirePerfil(requireUser(), 'admin');
    return _usuarios.map((item) => ({ ...item }));
  },

  criarUsuario: async (data) => {
    await delay();
    requirePerfil(requireUser(), 'admin');
    if (!data.nome || !data.email || !data.senha || !data.perfil) {
      throw new Error('Campos obrigatórios: nome, email, senha, perfil');
    }
    if (data.senha.length < 6) {
      throw new Error('Senha mínima: 6 caracteres');
    }
    if (_usuarios.find(u => u.email === data.email?.toLowerCase()))
      throw new Error('E-mail já cadastrado');
    const novo = {
      id: nextId(),
      nome: data.nome,
      email: data.email.toLowerCase(),
      perfil: data.perfil,
      escrevente_id: data.escrevente_id || null,
      ativo: true,
    };
    _usuarios.push(novo);
    return { ...novo };
  },

  atualizarUsuario: async (id, data) => {
    await delay();
    requirePerfil(requireUser(), 'admin');
    const idx = _usuarios.findIndex(u => u.id === id);
    if (idx === -1) throw new Error('Usuário não encontrado');
    if (!data.nome || !data.email || !data.perfil) {
      throw new Error('Campos obrigatórios: nome, email, perfil');
    }
    _usuarios[idx] = {
      ..._usuarios[idx],
      nome: data.nome,
      email: data.email.toLowerCase(),
      perfil: data.perfil,
      escrevente_id: data.escrevente_id || null,
      ativo: data.ativo !== false,
      id,
    };
    return { ..._usuarios[idx] };
  },
};
