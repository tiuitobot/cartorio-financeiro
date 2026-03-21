const { formatDatePtBr, normalizeNullableString } = require('./audit');
const {
  buildPagamentoState,
  normalizePagamentosPayload,
  toMoney,
} = require('./pagamentos');

const PENDENCIA_TIPOS = {
  PENDENCIA_PAGAMENTO: 'pendencia_pagamento',
  CONFIRMACAO_PENDENTE: 'confirmacao_pendente',
  MANIFESTACAO_ESCREVENTE: 'manifestacao_escrevente',
  INFORMACAO_CONFLITANTE: 'informacao_conflitante',
  INFORMACAO_INCOMPLETA: 'informacao_incompleta',
};

const AUTO_SYNC_TYPES = [
  PENDENCIA_TIPOS.PENDENCIA_PAGAMENTO,
  PENDENCIA_TIPOS.CONFIRMACAO_PENDENTE,
  PENDENCIA_TIPOS.INFORMACAO_INCOMPLETA,
];

function normalizeControle(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return null;
  return digits.length < 5 ? digits.padStart(5, '0') : digits;
}

function normalizeDateRef(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);

  const normalized = normalizeNullableString(value);
  if (!normalized) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) return normalized.slice(0, 10);

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return normalized;
  return parsed.toISOString().slice(0, 10);
}

function buildPendenciaKey(...parts) {
  return parts.filter(Boolean).join(':');
}

function resolvePagamentosForPendencias(ato = {}) {
  if (Array.isArray(ato.pagamentos) && ato.pagamentos.length > 0) {
    return ato.pagamentos;
  }

  return normalizePagamentosPayload(undefined, ato);
}

function listIncompleteReasons(ato = {}, pagamentos = []) {
  const reasons = [];

  if (!normalizeNullableString(ato.data_ato)) reasons.push('data do ato ausente');
  if (!normalizeNullableString(ato.tipo_ato)) reasons.push('tipo de ato ausente');

  const livro = Number.parseInt(ato.livro, 10);
  const pagina = Number.parseInt(ato.pagina, 10);
  if (!Number.isFinite(livro) || livro <= 0) reasons.push('livro ausente');
  if (!Number.isFinite(pagina) || pagina <= 0) reasons.push('página ausente');
  if (toMoney(ato.emolumentos) <= 0) reasons.push('emolumentos não informados');

  const pagamentoIncompleto = pagamentos.some((pagamento) =>
    toMoney(pagamento.valor) > 0 && (!pagamento.data_pagamento || !pagamento.forma_pagamento)
  );
  if (pagamentoIncompleto) {
    reasons.push('pagamento lançado sem data ou forma');
  }

  return reasons;
}

function buildAutomaticPendenciasForAto(ato = {}) {
  const pagamentos = resolvePagamentosForPendencias(ato);
  const paymentState = buildPagamentoState(pagamentos);
  const pendencias = [];
  const controleRef = normalizeControle(ato.controle);
  const dataAtoRef = normalizeDateRef(ato.data_ato);

  if (paymentState.totalCount === 0) {
    pendencias.push({
      chave_unica: buildPendenciaKey('ato', ato.id, PENDENCIA_TIPOS.PENDENCIA_PAGAMENTO),
      tipo: PENDENCIA_TIPOS.PENDENCIA_PAGAMENTO,
      descricao: 'Ato sem pagamento lançado.',
      metadata: {
        pagamentos_lancados: paymentState.totalCount,
      },
      controle_ref: controleRef,
      data_ato_ref: dataAtoRef,
    });
  }

  if (paymentState.totalCount > 0 && paymentState.pendingCount > 0) {
    pendencias.push({
      chave_unica: buildPendenciaKey('ato', ato.id, PENDENCIA_TIPOS.CONFIRMACAO_PENDENTE),
      tipo: PENDENCIA_TIPOS.CONFIRMACAO_PENDENTE,
      descricao: `${paymentState.pendingCount} lançamento(s) aguardando conferência financeira.`,
      metadata: {
        pagamentos_lancados: paymentState.totalCount,
        pagamentos_confirmados: paymentState.confirmedCount,
        pagamentos_pendentes: paymentState.pendingCount,
        valor_pago_lancado: paymentState.lancado.valor_pago,
        valor_pago_confirmado: paymentState.confirmado.valor_pago,
      },
      controle_ref: controleRef,
      data_ato_ref: dataAtoRef,
    });
  }

  const incompleteReasons = listIncompleteReasons(ato, pagamentos);
  if (incompleteReasons.length > 0) {
    pendencias.push({
      chave_unica: buildPendenciaKey('ato', ato.id, PENDENCIA_TIPOS.INFORMACAO_INCOMPLETA),
      tipo: PENDENCIA_TIPOS.INFORMACAO_INCOMPLETA,
      descricao: `Informações incompletas: ${incompleteReasons.join('; ')}.`,
      metadata: {
        motivos: incompleteReasons,
      },
      controle_ref: controleRef,
      data_ato_ref: dataAtoRef,
    });
  }

  return pendencias;
}

async function fetchAtoContextForPendencias(client, atoId) {
  const { rows } = await client.query(
    `SELECT
       a.*,
       COALESCE((
         SELECT json_agg(row_to_json(pgto) ORDER BY pgto.data_pagamento NULLS LAST, pgto.id)
           FROM (
             SELECT
               p.id,
               p.ato_id,
               p.valor,
               p.data_pagamento,
               p.forma_pagamento,
               p.notas,
               p.confirmado_financeiro,
               p.confirmado_financeiro_por,
               p.confirmado_financeiro_em
             FROM pagamentos_ato p
             WHERE p.ato_id = a.id
           ) pgto
       ), '[]'::json) AS pagamentos
     FROM atos a
    WHERE a.id = $1`,
    [atoId]
  );

  return rows[0] || null;
}

async function upsertOpenPendencia(client, payload = {}) {
  const metadata = payload.metadata || {};
  const existing = payload.chave_unica
    ? await client.query(
      `SELECT id
         FROM pendencias
        WHERE chave_unica = $1
          AND solucionado = false
          AND visivel = true
        LIMIT 1`,
      [payload.chave_unica]
    )
    : { rows: [] };

  if (existing.rows[0]) {
    const { rows } = await client.query(
      `UPDATE pendencias
          SET ato_id = $2,
              import_lote_id = $3,
              tipo = $4,
              descricao = $5,
              escrevente_id = $6,
              origem = $7,
              controle_ref = $8,
              data_ato_ref = $9,
              metadata = $10
        WHERE id = $1
        RETURNING *`,
      [
        existing.rows[0].id,
        payload.ato_id || null,
        payload.import_lote_id || null,
        payload.tipo,
        payload.descricao || null,
        payload.escrevente_id || null,
        payload.origem || 'automatica',
        payload.controle_ref || null,
        payload.data_ato_ref || null,
        JSON.stringify(metadata),
      ]
    );
    return rows[0];
  }

  const { rows } = await client.query(
    `INSERT INTO pendencias(
       ato_id, import_lote_id, tipo, descricao, escrevente_id, origem,
       controle_ref, data_ato_ref, criado_por_user_id, chave_unica, metadata
     ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [
      payload.ato_id || null,
      payload.import_lote_id || null,
      payload.tipo,
      payload.descricao || null,
      payload.escrevente_id || null,
      payload.origem || 'automatica',
      payload.controle_ref || null,
      payload.data_ato_ref || null,
      payload.criado_por_user_id || null,
      payload.chave_unica || null,
      JSON.stringify(metadata),
    ]
  );
  return rows[0];
}

async function resolvePendenciaByKey(client, chaveUnica, actorUserId, resolucao) {
  if (!chaveUnica) return;

  await client.query(
    `UPDATE pendencias
        SET solucionado = true,
            solucionado_em = NOW(),
            solucionado_por_user_id = $2,
            resolucao = COALESCE(resolucao, $3)
      WHERE chave_unica = $1
        AND solucionado = false
        AND visivel = true`,
    [chaveUnica, actorUserId || null, resolucao || 'Resolvida automaticamente pelo sistema']
  );
}

async function syncAutomaticPendenciasForAtoId(client, atoId, options = {}) {
  const ato = await fetchAtoContextForPendencias(client, atoId);
  if (!ato) return [];

  const desired = buildAutomaticPendenciasForAto(ato);
  const desiredKeys = new Set(desired.map((item) => item.chave_unica));

  const synced = [];
  for (const item of desired) {
    synced.push(await upsertOpenPendencia(client, {
      ...item,
      ato_id: atoId,
      origem: 'automatica',
      criado_por_user_id: options.actorUserId || null,
    }));
  }

  if (desiredKeys.size > 0) {
    const { rows: openRows } = await client.query(
      `SELECT id, chave_unica
         FROM pendencias
        WHERE ato_id = $1
          AND origem = 'automatica'
          AND tipo = ANY($2::text[])
          AND solucionado = false
          AND visivel = true`,
      [atoId, AUTO_SYNC_TYPES]
    );

    for (const row of openRows) {
      if (!desiredKeys.has(row.chave_unica)) {
        await resolvePendenciaByKey(
          client,
          row.chave_unica,
          options.actorUserId || null,
          'Pendência resolvida automaticamente após atualização do ato'
        );
      }
    }
  } else {
    await client.query(
      `UPDATE pendencias
          SET solucionado = true,
              solucionado_em = NOW(),
              solucionado_por_user_id = $2,
              resolucao = COALESCE(resolucao, $3)
        WHERE ato_id = $1
          AND origem = 'automatica'
          AND tipo = ANY($4::text[])
          AND solucionado = false
          AND visivel = true`,
      [
        atoId,
        options.actorUserId || null,
        'Pendência resolvida automaticamente após atualização do ato',
        AUTO_SYNC_TYPES,
      ]
    );
  }

  return synced;
}

function buildManifestacaoMensagem(user, texto) {
  return `${user.nome}; Data da Notificação: ${formatDatePtBr()}; ${texto}`;
}

function isUserRelatedToAto(ato, escreventeId) {
  if (!ato || !escreventeId) return false;
  return [ato.captador_id, ato.executor_id, ato.signatario_id].includes(escreventeId);
}

async function createManifestacaoPendencia(client, { ato, user, mensagem, confirmarSemRelacao = false }) {
  const texto = normalizeNullableString(mensagem);
  if (!texto) {
    return { error: 'Manifestação obrigatória' };
  }

  if (!ato) {
    return { error: 'Ato não encontrado' };
  }

  if (!user?.escrevente_id) {
    return { error: 'Usuário não vinculado a escrevente' };
  }

  const relacionado = isUserRelatedToAto(ato, user.escrevente_id);
  if (!relacionado && !confirmarSemRelacao) {
    return {
      requiresConfirmation: true,
      ato: {
        id: ato.id,
        controle: ato.controle,
        livro: ato.livro,
        pagina: ato.pagina,
        data_ato: ato.data_ato,
      },
    };
  }

  const mensagemCorrecao = buildManifestacaoMensagem(user, texto);
  const correctionResult = await client.query(
    `INSERT INTO correcoes(ato_id, autor, autor_id, mensagem, data, status)
     VALUES($1,$2,$3,$4,$5,'aguardando')
     RETURNING id`,
    [ato.id, user.nome || user.email || 'Escrevente', user.id || null, mensagemCorrecao, formatDatePtBr()]
  );

  const pendencia = await upsertOpenPendencia(client, {
    ato_id: ato.id,
    tipo: PENDENCIA_TIPOS.MANIFESTACAO_ESCREVENTE,
    descricao: texto,
    escrevente_id: user.escrevente_id,
    origem: 'escrevente',
      controle_ref: normalizeControle(ato.controle),
      data_ato_ref: normalizeDateRef(ato.data_ato),
    criado_por_user_id: user.id || null,
    metadata: {
      relacionado_ao_ato: relacionado,
      correcao_id: correctionResult.rows[0].id,
    },
  });

  return { pendencia, relacionado };
}

async function createReembolsoContestacaoPendencia(client, { pagamento, user, justificativa }) {
  return upsertOpenPendencia(client, {
    tipo: PENDENCIA_TIPOS.MANIFESTACAO_ESCREVENTE,
    descricao: `Contestação de reembolso: ${justifyText(justificativa)}`,
    escrevente_id: pagamento.escrevente_id || user?.escrevente_id || null,
    origem: 'escrevente',
    criado_por_user_id: user?.id || null,
    chave_unica: buildPendenciaKey('reembolso', pagamento.id, 'contestacao'),
    metadata: {
      reembolso_id: pagamento.id,
      contestacao_justificativa: justifyText(justificativa),
    },
  });
}

function justifyText(value) {
  return normalizeNullableString(value) || 'sem justificativa informada';
}

async function resolveReembolsoContestacaoPendencia(client, pagamentoId, actorUserId) {
  await resolvePendenciaByKey(
    client,
    buildPendenciaKey('reembolso', pagamentoId, 'contestacao'),
    actorUserId || null,
    'Contestação de reembolso encerrada'
  );
}

async function createImportIssuePendencia(client, payload = {}) {
  return upsertOpenPendencia(client, {
    tipo: payload.tipo,
    descricao: payload.descricao,
    ato_id: payload.ato_id || null,
    import_lote_id: payload.import_lote_id || null,
    escrevente_id: payload.escrevente_id || null,
    origem: 'automatica',
    controle_ref: normalizeControle(payload.controle_ref),
    data_ato_ref: payload.data_ato_ref || null,
    criado_por_user_id: payload.criado_por_user_id || null,
    chave_unica: payload.chave_unica || null,
    metadata: payload.metadata || {},
  });
}

function pendenciaCanOpenAto(row, user) {
  if (['admin', 'financeiro', 'chefe_financeiro'].includes(user?.perfil)) return Boolean(row.ato_id);
  return Boolean(row.ato_id) && isUserRelatedToAto({
    captador_id: row.ato_captador_id,
    executor_id: row.ato_executor_id,
    signatario_id: row.ato_signatario_id,
  }, user?.escrevente_id);
}

function serializePendencia(row, user) {
  const metadata = row.metadata || {};
  const ownPendencia = user?.escrevente_id && row.escrevente_id === user.escrevente_id;
  const relatedToAto = isUserRelatedToAto({
    captador_id: row.ato_captador_id,
    executor_id: row.ato_executor_id,
    signatario_id: row.ato_signatario_id,
  }, user?.escrevente_id);
  const restrictedAto = user?.perfil === 'escrevente' && ownPendencia && row.ato_id && !relatedToAto;
  const controle = row.controle_ref || row.ato_controle || null;

  return {
    id: row.id,
    ato_id: row.ato_id,
    import_lote_id: row.import_lote_id,
    tipo: row.tipo,
    descricao: row.descricao,
    criado_em: row.criado_em,
    solucionado: row.solucionado,
    solucionado_em: row.solucionado_em,
    resolucao: row.resolucao,
    origem: row.origem,
    visivel: row.visivel,
    escrevente_id: row.escrevente_id,
    escrevente_nome: row.escrevente_nome,
    controle: controle,
    referencia: restrictedAto || !row.ato_livro || !row.ato_pagina ? null : `${row.ato_livro}/${row.ato_pagina}`,
    data_ato: restrictedAto ? null : (row.data_ato_ref || row.ato_data_ato || null),
    tipo_ato: restrictedAto ? null : (row.ato_tipo_ato || null),
    acesso_ato_restrito: restrictedAto,
    pode_abrir_ato: pendenciaCanOpenAto(row, user),
    metadata,
  };
}

module.exports = {
  AUTO_SYNC_TYPES,
  PENDENCIA_TIPOS,
  buildAutomaticPendenciasForAto,
  createImportIssuePendencia,
  createManifestacaoPendencia,
  createReembolsoContestacaoPendencia,
  fetchAtoContextForPendencias,
  normalizeControle,
  resolveReembolsoContestacaoPendencia,
  serializePendencia,
  syncAutomaticPendenciasForAtoId,
  upsertOpenPendencia,
};
