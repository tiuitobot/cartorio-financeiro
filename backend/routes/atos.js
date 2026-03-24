const router = require('express').Router();
const db = require('../db');
const { authMiddleware, requirePerfil } = require('../middleware/auth');
const {
  canEditAto,
  canEditReembolsoTabeliao,
  validateReembolsoTabeliaoWrite,
} = require('../lib/ato-permissions');
const { calcStatus, enrichAtoFinance } = require('../lib/finance');
const { buildAtosScope } = require('../lib/list-scopes');
const {
  formatDatePtBr,
  normalizeNullableString,
} = require('../lib/audit');
const {
  toMoney,
  normalizeFormaPagamento,
  normalizePagamentosPayload,
  validatePagamentos,
  buildPagamentoState,
  resolvePagamentoConfirmations,
  replacePagamentosAto,
} = require('../lib/pagamentos');
const { buildAtoDiffMessage } = require('../lib/ato-diff');
const { syncAutomaticPendenciasForAtoId } = require('../lib/pendencias');

// ── helpers ──────────────────────────────────────────────────────────────────
function normalizeControle(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '00000';
  return digits.length < 5 ? digits.padStart(5, '0') : digits;
}

function toOptionalInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeAtoPayload(payload, options = {}) {
  const previousAto = options.previousAto || null;
  const previousPagamentos = options.previousPagamentos || [];
  const actor = options.actor || {};
  const emolumentos = toMoney(payload.emolumentos);
  const repasses = toMoney(payload.repasses);
  const issqn = toMoney(payload.issqn);
  const reembolsoTabeliao = toMoney(payload.reembolso_tabeliao);
  const reembolsoEscrevente = toMoney(payload.reembolso_escrevente);
  const pagamentosNormalizados = normalizePagamentosPayload(payload.pagamentos, payload);
  const pagamentos = resolvePagamentoConfirmations(pagamentosNormalizados, previousPagamentos, actor);
  const paymentState = buildPagamentoState(pagamentos);
  const valorPagoConfirmado = paymentState.confirmado.valor_pago;
  const verificadoEm = paymentState.allConfirmed && paymentState.verificado_em
    ? formatDatePtBr(new Date(paymentState.verificado_em))
    : null;

  return {
    controle: normalizeControle(payload.controle),
    livro: String(Number.parseInt(payload.livro, 10) || 0),
    pagina: String(Number.parseInt(payload.pagina, 10) || 0),
    data_ato: normalizeNullableString(payload.data_ato),
    tipo_ato: normalizeNullableString(payload.tipo_ato),
    nome_tomador: normalizeNullableString(payload.nome_tomador),
    captador_id: toOptionalInt(payload.captador_id),
    executor_id: toOptionalInt(payload.executor_id),
    signatario_id: toOptionalInt(payload.signatario_id),
    emolumentos,
    repasses,
    issqn,
    reembolso_tabeliao: reembolsoTabeliao,
    reembolso_escrevente: reembolsoEscrevente,
    escrevente_reembolso_id: reembolsoEscrevente > 0 ? toOptionalInt(payload.escrevente_reembolso_id) : null,
    pagamentos,
    valor_pago: valorPagoConfirmado,
    data_pagamento: paymentState.confirmado.data_pagamento,
    forma_pagamento: paymentState.confirmado.forma_pagamento,
    controle_cheques: normalizeNullableString(payload.controle_cheques),
    status: calcStatus(
      emolumentos,
      repasses,
      issqn,
      reembolsoTabeliao,
      reembolsoEscrevente,
      valorPagoConfirmado
    ),
    verificado_por: paymentState.allConfirmed ? paymentState.verificado_por : null,
    verificado_em: paymentState.allConfirmed ? verificadoEm : null,
    comissao_override: Array.isArray(payload.comissao_override) && payload.comissao_override.length
      ? JSON.stringify(payload.comissao_override)
      : null,
    notas: normalizeNullableString(payload.notas),
  };
}

function validateAtoPayload(ato, options = {}) {
  const reembolsoTabeliaoError = validateReembolsoTabeliaoWrite({
    actor: options.actor || null,
    previousAto: options.previousAto || null,
    nextAto: ato,
  });
  if (reembolsoTabeliaoError) return reembolsoTabeliaoError;

  if (ato.controle === '00000') return 'Controle é obrigatório';
  if (ato.livro === '0') return 'Livro é obrigatório';
  if (ato.pagina === '0') return 'Página é obrigatória';

  const moneyFields = [
    ['emolumentos', ato.emolumentos],
    ['repasses', ato.repasses],
    ['issqn', ato.issqn],
    ['reembolso_tabeliao', ato.reembolso_tabeliao],
    ['reembolso_escrevente', ato.reembolso_escrevente],
    ['valor_pago', ato.valor_pago],
  ];

  const invalidMoneyField = moneyFields.find(([, value]) => value < 0);
  if (invalidMoneyField) {
    return `Campo inválido: ${invalidMoneyField[0]} não pode ser negativo`;
  }

  const pagamentosError = validatePagamentos(ato.pagamentos);
  if (pagamentosError) return pagamentosError;

  if (ato.reembolso_escrevente > 0 && !ato.escrevente_reembolso_id) {
    return 'Selecione o escrevente que receberá o reembolso';
  }

  return null;
}

function handleAtoWriteError(error, res) {
  if (error?.code === '23505') {
    if (error.constraint === 'ux_atos_controle_valido') {
      return res.status(409).json({ erro: 'Já existe um ato com este controle' });
    }
    if (error.constraint === 'ux_atos_livro_pagina_validos') {
      return res.status(409).json({ erro: 'Já existe um ato para esta referência de livro e página' });
    }
  }

  console.error(error);
  return res.status(500).json({ erro: 'Erro interno' });
}

async function podeVerAto(ato, user, dbClient) {
  if (['admin','financeiro','chefe_financeiro'].includes(user.perfil)) return true;
  // Participação direta
  if (user.escrevente_id && [ato.captador_id, ato.executor_id, ato.signatario_id].includes(user.escrevente_id)) return true;
  // Vínculo: apenas se captador declarou compartilhar comigo (captador-only, não transitivo)
  if (!ato.captador_id || !user.escrevente_id) return false;
  const { rows } = await dbClient.query(
    'SELECT 1 FROM escreventes_compartilhamento WHERE escrevente_id=$1 AND compartilha_com_id=$2 LIMIT 1',
    [ato.captador_id, user.escrevente_id]
  );
  return rows.length > 0;
}

function mapAtoRows(rows) {
  return rows.map((row) => enrichAtoFinance(row));
}

const ATO_SELECT = `
  SELECT a.*,
    cap.nome  AS captador_nome,
    COALESCE(cap_taxa_hist.taxa, cap.taxa)  AS captador_taxa,
    exe.nome  AS executor_nome,
    COALESCE(exe_taxa_hist.taxa, exe.taxa)  AS executor_taxa,
    sig.nome  AS signatario_nome,
    COALESCE(sig_taxa_hist.taxa, sig.taxa)  AS signatario_taxa,
    re.nome   AS escrevente_reembolso_nome,
    COALESCE((
      SELECT json_agg(row_to_json(corr) ORDER BY corr.created_at, corr.id)
      FROM (
        SELECT c.id, c.ato_id, c.autor, c.autor_id, c.mensagem, c.data, c.status, c.created_at
        FROM correcoes c
        WHERE c.ato_id = a.id
      ) corr
    ), '[]'::json) AS correcoes,
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
          p.confirmado_financeiro_em,
          p.created_at,
          p.updated_at
        FROM pagamentos_ato p
        WHERE p.ato_id = a.id
      ) pgto
    ), '[]'::json) AS pagamentos
  FROM atos a
  LEFT JOIN escreventes cap ON a.captador_id = cap.id
  LEFT JOIN LATERAL (
    SELECT h.taxa
      FROM escreventes_taxas_historico h
     WHERE h.escrevente_id = a.captador_id
     ORDER BY
       CASE WHEN h.vigencia_inicio <= COALESCE(a.data_ato, CURRENT_DATE) THEN 0 ELSE 1 END,
       CASE WHEN h.vigencia_inicio <= COALESCE(a.data_ato, CURRENT_DATE) THEN h.vigencia_inicio END DESC NULLS LAST,
       CASE WHEN h.vigencia_inicio > COALESCE(a.data_ato, CURRENT_DATE) THEN h.created_at END ASC NULLS LAST,
       CASE WHEN h.vigencia_inicio > COALESCE(a.data_ato, CURRENT_DATE) THEN h.id END ASC NULLS LAST
     LIMIT 1
  ) cap_taxa_hist ON TRUE
  LEFT JOIN escreventes exe ON a.executor_id = exe.id
  LEFT JOIN LATERAL (
    SELECT h.taxa
      FROM escreventes_taxas_historico h
     WHERE h.escrevente_id = a.executor_id
     ORDER BY
       CASE WHEN h.vigencia_inicio <= COALESCE(a.data_ato, CURRENT_DATE) THEN 0 ELSE 1 END,
       CASE WHEN h.vigencia_inicio <= COALESCE(a.data_ato, CURRENT_DATE) THEN h.vigencia_inicio END DESC NULLS LAST,
       CASE WHEN h.vigencia_inicio > COALESCE(a.data_ato, CURRENT_DATE) THEN h.created_at END ASC NULLS LAST,
       CASE WHEN h.vigencia_inicio > COALESCE(a.data_ato, CURRENT_DATE) THEN h.id END ASC NULLS LAST
     LIMIT 1
  ) exe_taxa_hist ON TRUE
  LEFT JOIN escreventes sig ON a.signatario_id = sig.id
  LEFT JOIN LATERAL (
    SELECT h.taxa
      FROM escreventes_taxas_historico h
     WHERE h.escrevente_id = a.signatario_id
     ORDER BY
       CASE WHEN h.vigencia_inicio <= COALESCE(a.data_ato, CURRENT_DATE) THEN 0 ELSE 1 END,
       CASE WHEN h.vigencia_inicio <= COALESCE(a.data_ato, CURRENT_DATE) THEN h.vigencia_inicio END DESC NULLS LAST,
       CASE WHEN h.vigencia_inicio > COALESCE(a.data_ato, CURRENT_DATE) THEN h.created_at END ASC NULLS LAST,
       CASE WHEN h.vigencia_inicio > COALESCE(a.data_ato, CURRENT_DATE) THEN h.id END ASC NULLS LAST
     LIMIT 1
  ) sig_taxa_hist ON TRUE
  LEFT JOIN escreventes re  ON a.escrevente_reembolso_id = re.id
`;

async function loadEscreventeLookup(client, ids = []) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length) return {};

  const { rows } = await client.query(
    'SELECT id, nome FROM escreventes WHERE id = ANY($1::int[])',
    [uniqueIds]
  );

  return rows.reduce((acc, row) => {
    acc[row.id] = row.nome;
    return acc;
  }, {});
}

async function syncCorrecoes(client, atoId, payloadCorrecoes = [], actor) {
  const { rows: currentCorrecoes } = await client.query(
    `SELECT id, autor, autor_id, mensagem, data, status
       FROM correcoes
      WHERE ato_id = $1
      ORDER BY created_at, id`,
    [atoId]
  );
  const currentById = new Map(currentCorrecoes.map((row) => [String(row.id), row]));

  for (const correction of payloadCorrecoes) {
    const correctionId = String(correction?.id || '');
    const existing = currentById.get(correctionId);

    if (existing) {
      await client.query(
        `UPDATE correcoes
            SET status = $2
          WHERE id = $1`,
        [existing.id, correction.status || existing.status || 'aguardando']
      );
      currentById.delete(correctionId);
      continue;
    }

    await client.query(
      `INSERT INTO correcoes(ato_id, autor, autor_id, mensagem, data, status)
       VALUES($1,$2,$3,$4,$5,$6)`,
      [
        atoId,
        normalizeNullableString(correction.autor) || actor.nome || 'Financeiro',
        correction.autor_id || actor.id || null,
        correction.msg || correction.mensagem,
        formatDatePtBr(),
        correction.status || 'aguardando',
      ]
    );
  }
}

async function fetchAtoById(id) {
  const { rows } = await db.query(`${ATO_SELECT} WHERE a.id = $1`, [id]);

  return mapAtoRows(rows)[0] || null;
}

// ── GET /api/atos ─────────────────────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, captador_id, inicio, fim, busca, livro, pagina, envolvido_id } = req.query;
    let where = ['1=1'];
    let params = [];
    let i = 1;
    const scope = buildAtosScope(req.user);
    if (scope.error) return res.status(403).json({ erro: scope.error });

    if (status) { where.push(`a.status=$${i++}`); params.push(status); }
    if (captador_id) { where.push(`a.captador_id=$${i++}`); params.push(parseInt(captador_id)); }
    if (inicio) { where.push(`a.data_ato>=$${i++}`); params.push(inicio); }
    if (fim) { where.push(`a.data_ato<=$${i++}`); params.push(fim); }
    if (busca) {
      where.push(`(a.controle=$${i} OR a.controle LIKE $${i+1})`);
      params.push(normalizeControle(busca)); params.push('%'+busca.replace(/\D/g,'')+'%'); i+=2;
    }
    if (livro) { where.push(`a.livro=$${i++}`); params.push(String(parseInt(livro))); }
    if (pagina) { where.push(`a.pagina=$${i++}`); params.push(String(parseInt(pagina))); }
    if (envolvido_id) {
      const envolvidoId = parseInt(envolvido_id, 10);
      where.push(`(a.captador_id=$${i} OR a.executor_id=$${i} OR a.signatario_id=$${i})`);
      params.push(envolvidoId);
      i += 1;
    }

    if (scope.where) {
      const scopeCondition = scope.where
        .replace(/^\s*WHERE\s*/i, '')
        .replace(/\$1/g, `$${i}`);
      where.push(scopeCondition);
      params.push(...scope.params);
      i += scope.params.length;
    }

    const sql = `
      ${ATO_SELECT}
      WHERE ${where.join(' AND ')}
      ORDER BY
        a.data_ato DESC NULLS LAST,
        a.livro::int DESC,
        a.pagina::int DESC,
        a.id DESC
    `;
    const { rows } = await db.query(sql, params);
    res.json(mapAtoRows(rows));
  } catch (e) {
    console.error(e); res.status(500).json({ erro: 'Erro interno' });
  }
});

// ── POST /api/atos ────────────────────────────────────────────────────────────
router.post('/', authMiddleware, requirePerfil('admin','financeiro','chefe_financeiro'), async (req, res) => {
  const client = await db.connect();
  try {
    const atoPayload = normalizeAtoPayload(req.body, { actor: req.user });
    const validationError = validateAtoPayload(atoPayload, {
      actor: req.user,
      previousAto: null,
    });
    if (validationError) return res.status(400).json({ erro: validationError });

    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO atos(controle,livro,pagina,data_ato,tipo_ato,nome_tomador,captador_id,executor_id,signatario_id,
        emolumentos,repasses,issqn,reembolso_tabeliao,reembolso_escrevente,escrevente_reembolso_id,
        valor_pago,data_pagamento,forma_pagamento,controle_cheques,status,verificado_por,verificado_em,
        comissao_override,notas)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
      RETURNING id`,
      [atoPayload.controle, atoPayload.livro, atoPayload.pagina,
       atoPayload.data_ato, atoPayload.tipo_ato, atoPayload.nome_tomador, atoPayload.captador_id, atoPayload.executor_id, atoPayload.signatario_id,
       atoPayload.emolumentos, atoPayload.repasses, atoPayload.issqn, atoPayload.reembolso_tabeliao, atoPayload.reembolso_escrevente,
       atoPayload.escrevente_reembolso_id, atoPayload.valor_pago, atoPayload.data_pagamento, atoPayload.forma_pagamento,
       atoPayload.controle_cheques, atoPayload.status, atoPayload.verificado_por, atoPayload.verificado_em,
       atoPayload.comissao_override, atoPayload.notas]
    );
    await replacePagamentosAto(client, rows[0].id, atoPayload.pagamentos);
    await syncAutomaticPendenciasForAtoId(client, rows[0].id, { actorUserId: req.user.id || null });
    await client.query('COMMIT');
    const ato = await fetchAtoById(rows[0].id);
    res.status(201).json(ato);
  } catch (e) {
    await client.query('ROLLBACK');
    return handleAtoWriteError(e, res);
  } finally {
    client.release();
  }
});

// ── PUT /api/atos/:id ─────────────────────────────────────────────────────────
router.put('/:id', authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id);
  const podeEditar = canEditAto(req.user);
  if (!podeEditar) return res.status(403).json({ erro: 'Permissão insuficiente' });

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { rows: currentRows } = await client.query(
      'SELECT * FROM atos WHERE id=$1 FOR UPDATE',
      [id]
    );
    if (!currentRows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ erro: 'Ato não encontrado' });
    }
    const { rows: currentPagamentos } = await client.query(
      `SELECT id, ato_id, valor, data_pagamento, forma_pagamento, notas,
              confirmado_financeiro, confirmado_financeiro_por, confirmado_financeiro_em
         FROM pagamentos_ato
        WHERE ato_id = $1
        ORDER BY data_pagamento NULLS LAST, id`,
      [id]
    );

    const atoPayload = normalizeAtoPayload(req.body, {
      previousAto: currentRows[0],
      previousPagamentos: currentPagamentos,
      actor: req.user,
    });
    const validationError = validateAtoPayload(atoPayload, {
      actor: req.user,
      previousAto: currentRows[0],
    });
    if (validationError) {
      await client.query('ROLLBACK');
      return res.status(400).json({ erro: validationError });
    }

    await client.query(`
      UPDATE atos SET
        controle=$1,livro=$2,pagina=$3,data_ato=$4,tipo_ato=$5,nome_tomador=$6,captador_id=$7,executor_id=$8,signatario_id=$9,
        emolumentos=$10,repasses=$11,issqn=$12,reembolso_tabeliao=$13,reembolso_escrevente=$14,
        escrevente_reembolso_id=$15,valor_pago=$16,data_pagamento=$17,forma_pagamento=$18,controle_cheques=$19,
        status=$20,verificado_por=$21,verificado_em=$22,comissao_override=$23,notas=$24
      WHERE id=$25`,
      [atoPayload.controle, atoPayload.livro, atoPayload.pagina,
       atoPayload.data_ato, atoPayload.tipo_ato, atoPayload.nome_tomador, atoPayload.captador_id, atoPayload.executor_id, atoPayload.signatario_id,
       atoPayload.emolumentos, atoPayload.repasses, atoPayload.issqn, atoPayload.reembolso_tabeliao, atoPayload.reembolso_escrevente,
       atoPayload.escrevente_reembolso_id, atoPayload.valor_pago, atoPayload.data_pagamento, atoPayload.forma_pagamento,
       atoPayload.controle_cheques, atoPayload.status, atoPayload.verificado_por, atoPayload.verificado_em,
       atoPayload.comissao_override, atoPayload.notas, id]
    );
    await replacePagamentosAto(client, id, atoPayload.pagamentos);

    if (Array.isArray(req.body.correcoes)) {
      await syncCorrecoes(client, id, req.body.correcoes, req.user);
    }

    const escreventesById = await loadEscreventeLookup(client, [
      currentRows[0].captador_id,
      currentRows[0].executor_id,
      currentRows[0].signatario_id,
      currentRows[0].escrevente_reembolso_id,
      atoPayload.captador_id,
      atoPayload.executor_id,
      atoPayload.signatario_id,
      atoPayload.escrevente_reembolso_id,
    ]);
    const autoDiff = buildAtoDiffMessage({
      previousAto: currentRows[0],
      nextAto: atoPayload,
      previousPagamentos: currentPagamentos,
      nextPagamentos: atoPayload.pagamentos,
      escreventesById,
      actorName: req.user.nome || req.user.email || 'Sistema',
    });

    if (autoDiff) {
      await client.query(
        `INSERT INTO correcoes(ato_id, autor, autor_id, mensagem, data, status)
         VALUES($1,$2,$3,$4,$5,$6)`,
        [id, autoDiff.autor, req.user.id || null, autoDiff.mensagem, autoDiff.data, autoDiff.status]
      );
    }

    await syncAutomaticPendenciasForAtoId(client, id, { actorUserId: req.user.id || null });

    await client.query('COMMIT');
    const ato = await fetchAtoById(id);
    res.json(ato);
  } catch (e) {
    await client.query('ROLLBACK');
    return handleAtoWriteError(e, res);
  } finally { client.release(); }
});

module.exports = router;
