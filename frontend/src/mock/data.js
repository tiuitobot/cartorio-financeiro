// Dados de demonstração para o mock local.
// Não incluir em produção.

export const MOCK_ESCREVENTES = [
  { id: 1, nome: 'João Silva',      cargo: 'Escrevente Sênior', email: 'joao@cartorio.com',    taxa: 6,  ativo: true, compartilhar_com: [2] },
  { id: 2, nome: 'Maria Santos',    cargo: 'Escrevente',        email: 'maria@cartorio.com',   taxa: 20, ativo: true, compartilhar_com: [] },
  { id: 3, nome: 'Pedro Oliveira',  cargo: 'Escrevente',        email: 'pedro@cartorio.com',   taxa: 20, ativo: true, compartilhar_com: [] },
  { id: 4, nome: 'Ana Costa',       cargo: 'Escrevente',        email: 'ana@cartorio.com',     taxa: 30, ativo: true, compartilhar_com: [3] },
  { id: 5, nome: 'Carlos Mendes',   cargo: 'Estagiário',        email: 'carlos@cartorio.com',  taxa: 30, ativo: true, compartilhar_com: [] },
];

export const MOCK_USUARIOS = [
  { id: 1, nome: 'Tabelião Admin',  email: 'admin@cartorio.com',      perfil: 'admin',            escrevente_id: null, ativo: true },
  { id: 2, nome: 'Chefe Financeiro',email: 'chefe@cartorio.com',      perfil: 'chefe_financeiro', escrevente_id: null, ativo: true },
  { id: 3, nome: 'Ana Financeiro',  email: 'financeiro@cartorio.com', perfil: 'financeiro',       escrevente_id: null, ativo: true },
  { id: 4, nome: 'João Silva',      email: 'joao@cartorio.com',       perfil: 'escrevente',       escrevente_id: 1,    ativo: true },
  { id: 5, nome: 'Maria Santos',    email: 'maria@cartorio.com',      perfil: 'escrevente',       escrevente_id: 2,    ativo: true },
];

// Contas válidas para login no mock: qualquer senha de 6+ chars funciona
// mas as listadas aqui são as "oficiais" mostradas na tela de login
export const MOCK_LOGINS = {
  'admin@cartorio.com':      { ...MOCK_USUARIOS[0] },
  'chefe@cartorio.com':      { ...MOCK_USUARIOS[1] },
  'financeiro@cartorio.com': { ...MOCK_USUARIOS[2] },
  'joao@cartorio.com':       { ...MOCK_USUARIOS[3] },
  'maria@cartorio.com':      { ...MOCK_USUARIOS[4] },
};

export const MOCK_ATOS = [
  {
    id: 1, controle: '42', livro: '42', pagina: '15',
    captador_id: 1, executor_id: 2, signatario_id: 4,
    emolumentos: 850.00, repasses: 120.00, issqn: 25.50, reembolso_tabeliao: 0, reembolso_escrevente: 0, escrevente_reembolso_id: null,
    data_ato: '2026-03-10', valor_pago: 995.50, data_pagamento: '2026-03-12', forma_pagamento: 'PIX',
    status: 'pago', verificado_por: 'Tabelião', verificado_em: '10/03/2026',
    correcoes: [], notas: '', comissao_override: null,
    total: 995.50, comissoes: [{ escrevente: { nome: 'João Silva' }, papel: 'captador', pct: 6, total: 51.00 }],
    reembolso_devido_escrevente: 0,
  },
  {
    id: 2, controle: '43', livro: '42', pagina: '16',
    captador_id: 1, executor_id: 3, signatario_id: null,
    emolumentos: 1200.00, repasses: 80.00, issqn: 36.00, reembolso_tabeliao: 0, reembolso_escrevente: 0, escrevente_reembolso_id: null,
    data_ato: '2026-03-11', valor_pago: 0, data_pagamento: '', forma_pagamento: '',
    status: 'pendente', verificado_por: null, verificado_em: null,
    correcoes: [], notas: '', comissao_override: null,
    total: 1316.00, comissoes: [], reembolso_devido_escrevente: 0,
  },
  {
    id: 3, controle: '44', livro: '42', pagina: '17',
    captador_id: 2, executor_id: 2, signatario_id: 5,
    emolumentos: 620.00, repasses: 50.00, issqn: 18.60, reembolso_tabeliao: 0, reembolso_escrevente: 80.00, escrevente_reembolso_id: 2,
    data_ato: '2026-03-08', valor_pago: 500.00, data_pagamento: '2026-03-09', forma_pagamento: 'Dinheiro',
    status: 'pago_menor', verificado_por: null, verificado_em: null,
    correcoes: [{ id: 101, autor: 'Financeiro', msg: 'Valor de emolumentos diverge da tabela.', data: '08/03/2026', status: 'aguardando' }],
    notas: 'Cliente pagou parcialmente.', comissao_override: null,
    total: 688.60, comissoes: [], reembolso_devido_escrevente: 0,
  },
  {
    id: 4, controle: '45', livro: '42', pagina: '18',
    captador_id: 3, executor_id: 3, signatario_id: 4,
    emolumentos: 2400.00, repasses: 200.00, issqn: 72.00, reembolso_tabeliao: 50.00, reembolso_escrevente: 0, escrevente_reembolso_id: null,
    data_ato: '2026-03-05', valor_pago: 2722.00, data_pagamento: '2026-03-06', forma_pagamento: 'Transferência',
    status: 'pago', verificado_por: 'Financeiro', verificado_em: '05/03/2026',
    correcoes: [], notas: '', comissao_override: null,
    total: 2722.00, comissoes: [], reembolso_devido_escrevente: 0,
  },
  {
    id: 5, controle: '38', livro: '41', pagina: '20',
    captador_id: 1, executor_id: 2, signatario_id: null,
    emolumentos: 450.00, repasses: 30.00, issqn: 13.50, reembolso_tabeliao: 0, reembolso_escrevente: 0, escrevente_reembolso_id: null,
    data_ato: '2026-02-20', valor_pago: 493.50, data_pagamento: '2026-02-22', forma_pagamento: 'Cartão de débito',
    status: 'pago', verificado_por: 'Tabelião', verificado_em: '20/02/2026',
    correcoes: [], notas: '', comissao_override: null,
    total: 493.50, comissoes: [], reembolso_devido_escrevente: 0,
  },
  {
    id: 6, controle: '39', livro: '41', pagina: '21',
    captador_id: 4, executor_id: 4, signatario_id: 3,
    emolumentos: 3100.00, repasses: 310.00, issqn: 93.00, reembolso_tabeliao: 0, reembolso_escrevente: 0, escrevente_reembolso_id: null,
    data_ato: '2026-02-18', valor_pago: 3600.00, data_pagamento: '2026-02-19', forma_pagamento: 'PIX',
    status: 'pago_maior', verificado_por: 'Chefe Financeiro', verificado_em: '18/02/2026',
    correcoes: [], notas: 'Cliente pagou a mais por engano.', comissao_override: null,
    total: 3503.00, comissoes: [], reembolso_devido_escrevente: 0,
  },
  {
    id: 7, controle: '40', livro: '41', pagina: '22',
    captador_id: 2, executor_id: 3, signatario_id: 5,
    emolumentos: 780.00, repasses: 60.00, issqn: 23.40, reembolso_tabeliao: 0, reembolso_escrevente: 0, escrevente_reembolso_id: null,
    data_ato: '2026-02-14', valor_pago: 0, data_pagamento: '', forma_pagamento: '',
    status: 'pendente', verificado_por: null, verificado_em: null,
    correcoes: [], notas: '', comissao_override: null,
    total: 863.40, comissoes: [], reembolso_devido_escrevente: 0,
  },
  {
    id: 8, controle: '30', livro: '40', pagina: '5',
    captador_id: 1, executor_id: 1, signatario_id: 2,
    emolumentos: 520.00, repasses: 40.00, issqn: 15.60, reembolso_tabeliao: 0, reembolso_escrevente: 0, escrevente_reembolso_id: null,
    data_ato: '2025-12-10', valor_pago: 575.60, data_pagamento: '2025-12-11', forma_pagamento: 'Dinheiro',
    status: 'pago', verificado_por: 'Tabelião', verificado_em: '10/12/2025',
    correcoes: [], notas: '', comissao_override: null,
    total: 575.60, comissoes: [], reembolso_devido_escrevente: 0,
  },
  {
    id: 9, controle: '31', livro: '40', pagina: '6',
    captador_id: 3, executor_id: 4, signatario_id: null,
    emolumentos: 960.00, repasses: 75.00, issqn: 28.80, reembolso_tabeliao: 0, reembolso_escrevente: 0, escrevente_reembolso_id: null,
    data_ato: '2025-12-15', valor_pago: 900.00, data_pagamento: '2025-12-16', forma_pagamento: 'Transferência',
    status: 'pago_menor', verificado_por: null, verificado_em: null,
    correcoes: [], notas: '', comissao_override: null,
    total: 1063.80, comissoes: [], reembolso_devido_escrevente: 0,
  },
  {
    id: 10, controle: '46', livro: '42', pagina: '19',
    captador_id: 5, executor_id: 5, signatario_id: 1,
    emolumentos: 1800.00, repasses: 150.00, issqn: 54.00, reembolso_tabeliao: 0, reembolso_escrevente: 0, escrevente_reembolso_id: null,
    data_ato: '2026-03-14', valor_pago: 0, data_pagamento: '', forma_pagamento: '',
    status: 'pendente', verificado_por: null, verificado_em: null,
    correcoes: [], notas: '', comissao_override: null,
    total: 2004.00, comissoes: [], reembolso_devido_escrevente: 0,
  },
];

export const MOCK_REEMBOLSOS = [
  { id: 1, escrevente_id: 2, valor: 80.00, descricao: 'Reembolso ato 44 — despesa de registro', data: '2026-03-09', confirmado: false, confirmado_em: null },
  { id: 2, escrevente_id: 1, valor: 45.00, descricao: 'Reembolso ato 38 — cartório de imóveis', data: '2026-02-22', confirmado: true,  confirmado_em: '2026-02-23' },
];

export const MOCK_REIVINDICACOES = [
  { id: 1, ato_id: 2, escrevente_id: 3, escrevente_nome: 'Pedro Oliveira', funcao: 'executor', status: 'pendente',   justificativa: '',           decisao_financeiro: '', data: '2026-03-12' },
  { id: 2, ato_id: 7, escrevente_id: 4, escrevente_nome: 'Ana Costa',      funcao: 'signatario', status: 'recusada', justificativa: 'Não participei deste ato.', decisao_financeiro: '', data: '2026-02-15' },
];
