const router = require('express').Router();
const db = require('../db');
const { authMiddleware, requirePerfil } = require('../middleware/auth');
const { calcStatus, enrichAtoFinance } = require('../lib/finance');
const {
  normalizeNullableString,
  resolveHistoricDate,
  resolveVerificationStamp,
} = require('../lib/audit');

// ── helpers ──────────────────────────────────────────────────────────────────
const padCtrl = v => String(v||'').replace(/\D/g,'').padStart(5,'0');

function toMoney(value) {
  const parsed = Number.parseFloat(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toOptionalInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeAtoPayload(payload, previousAto = null) {
  const emolumentos = toMoney(payload.emolumentos);
  const repasses = toMoney(payload.repasses);
  const issqn = toMoney(payload.issqn);
  const reembolsoTabeliao = toMoney(payload.reembolso_tabeliao);
  const reembolsoEscrevente = toMoney(payload.reembolso_escrevente);
  const valorPago = toMoney(payload.valor_pago);
  const verificadoPor = normalizeNullableString(payload.verificado_por);

  return {
    controle: padCtrl(payload.controle),
    livro: String(Number.parseInt(payload.livro, 10) || 0),
    pagina: String(Number.parseInt(payload.pagina, 10) || 0),
    data_ato: normalizeNullableString(payload.data_ato),
    captador_id: toOptionalInt(payload.captador_id),
    executor_id: toOptionalInt(payload.executor_id),
    signatario_id: toOptionalInt(payload.signatario_id),
    emolumentos,
    repasses,
    issqn,
    reembolso_tabeliao: reembolsoTabeliao,
    reembolso_escrevente: reembolsoEscrevente,
    escrevente_reembolso_id: reembolsoEscrevente > 0 ? toOptionalInt(payload.escrevente_reembolso_id) : null,
    valor_pago: valorPago,
    data_pagamento: normalizeNullableString(payload.data_pagamento),
    forma_pagamento: normalizeNullableString(payload.forma_pagamento),
    status: calcStatus(
      emolumentos,
      repasses,
      issqn,
      reembolsoTabeliao,
      reembolsoEscrevente,
      valorPago
    ),
    verificado_por: verificadoPor,
    verificado_em: resolveVerificationStamp(verificadoPor, previousAto),
    comissao_override: Array.isArray(payload.comissao_override) && payload.comissao_override.length
      ? JSON.stringify(payload.comissao_override)
      : null,
    notas: normalizeNullableString(payload.notas),
  };
}

function validateAtoPayload(ato) {
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
  const ids = [ato.captador_id, ato.executor_id, ato.signatario_id];
  if (user.escrevente_id && ids.includes(user.escrevente_id)) return true;
  // Verifica compartilhamentos
  const { rows } = await dbClient.query(
    'SELECT compartilha_com_id FROM escreventes_compartilhamento WHERE escrevente_id=$1', [user.escrevente_id]
  );
  const compartilhados = rows.map(r => r.compartilha_com_id);
  return ids.some(id => compartilhados.includes(id));
}

function mapAtoRows(rows) {
  return rows.map((row) => enrichAtoFinance(row));
}

async function fetchAtoById(id) {
  const { rows } = await db.query(`
    SELECT a.*,
      cap.nome  AS captador_nome,
      cap.taxa  AS captador_taxa,
      exe.nome  AS executor_nome,
      exe.taxa  AS executor_taxa,
      sig.nome  AS signatario_nome,
      sig.taxa  AS signatario_taxa,
      re.nome   AS escrevente_reembolso_nome,
      COALESCE(json_agg(row_to_json(c)) FILTER (WHERE c.id IS NOT NULL), '[]') AS correcoes
    FROM atos a
    LEFT JOIN escreventes cap ON a.captador_id = cap.id
    LEFT JOIN escreventes exe ON a.executor_id = exe.id
    LEFT JOIN escreventes sig ON a.signatario_id = sig.id
    LEFT JOIN escreventes re  ON a.escrevente_reembolso_id = re.id
    LEFT JOIN correcoes c ON c.ato_id = a.id
    WHERE a.id = $1
    GROUP BY a.id, cap.nome, cap.taxa, exe.nome, exe.taxa, sig.nome, sig.taxa, re.nome
  `, [id]);

  return mapAtoRows(rows)[0] || null;
}

// ── GET /api/atos ─────────────────────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, captador_id, inicio, fim, busca, livro, pagina } = req.query;
    let where = ['1=1'];
    let params = [];
    let i = 1;

    if (status) { where.push(`a.status=$${i++}`); params.push(status); }
    if (captador_id) { where.push(`a.captador_id=$${i++}`); params.push(parseInt(captador_id)); }
    if (inicio) { where.push(`a.data_ato>=$${i++}`); params.push(inicio); }
    if (fim) { where.push(`a.data_ato<=$${i++}`); params.push(fim); }
    if (busca) {
      where.push(`(a.controle=$${i} OR a.controle LIKE $${i+1})`);
      params.push(padCtrl(busca)); params.push('%'+busca.replace(/\D/g,'')+'%'); i+=2;
    }
    if (livro) { where.push(`a.livro=$${i++}`); params.push(String(parseInt(livro))); }
    if (pagina) { where.push(`a.pagina=$${i++}`); params.push(String(parseInt(pagina))); }

    // Filtro de visibilidade para escreventes
    if (req.user.perfil === 'escrevente' && req.user.escrevente_id) {
      const eid = req.user.escrevente_id;
      const { rows: comp } = await db.query(
        'SELECT compartilha_com_id FROM escreventes_compartilhamento WHERE escrevente_id=$1', [eid]
      );
      const ids = [eid, ...comp.map(r=>r.compartilha_com_id)];
      const placeholders = ids.map((_,k)=>`$${i+k}`).join(',');
      where.push(`(a.captador_id IN(${placeholders}) OR a.executor_id IN(${placeholders}) OR a.signatario_id IN(${placeholders}))`);
      params.push(...ids);
    }

    const sql = `
      SELECT a.*,
        cap.nome  AS captador_nome,
        cap.taxa  AS captador_taxa,
        exe.nome  AS executor_nome,
        exe.taxa  AS executor_taxa,
        sig.nome  AS signatario_nome,
        sig.taxa  AS signatario_taxa,
        re.nome   AS escrevente_reembolso_nome,
        COALESCE(json_agg(row_to_json(c)) FILTER (WHERE c.id IS NOT NULL), '[]') AS correcoes
      FROM atos a
      LEFT JOIN escreventes cap ON a.captador_id = cap.id
      LEFT JOIN escreventes exe ON a.executor_id = exe.id
      LEFT JOIN escreventes sig ON a.signatario_id = sig.id
      LEFT JOIN escreventes re  ON a.escrevente_reembolso_id = re.id
      LEFT JOIN correcoes c ON c.ato_id = a.id
      WHERE ${where.join(' AND ')}
      GROUP BY a.id, cap.nome, cap.taxa, exe.nome, exe.taxa, sig.nome, sig.taxa, re.nome
      ORDER BY a.data_ato DESC NULLS LAST, a.controle DESC
    `;
    const { rows } = await db.query(sql, params);
    res.json(mapAtoRows(rows));
  } catch (e) {
    console.error(e); res.status(500).json({ erro: 'Erro interno' });
  }
});

// ── POST /api/atos ────────────────────────────────────────────────────────────
router.post('/', authMiddleware, requirePerfil('admin','financeiro','chefe_financeiro'), async (req, res) => {
  const atoPayload = normalizeAtoPayload(req.body);
  const validationError = validateAtoPayload(atoPayload);
  if (validationError) return res.status(400).json({ erro: validationError });

  try {
    const { rows } = await db.query(`
      INSERT INTO atos(controle,livro,pagina,data_ato,captador_id,executor_id,signatario_id,
        emolumentos,repasses,issqn,reembolso_tabeliao,reembolso_escrevente,escrevente_reembolso_id,
        valor_pago,data_pagamento,forma_pagamento,status,verificado_por,verificado_em,
        comissao_override,notas)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
      RETURNING *`,
      [atoPayload.controle, atoPayload.livro, atoPayload.pagina,
       atoPayload.data_ato, atoPayload.captador_id, atoPayload.executor_id, atoPayload.signatario_id,
       atoPayload.emolumentos, atoPayload.repasses, atoPayload.issqn, atoPayload.reembolso_tabeliao, atoPayload.reembolso_escrevente,
       atoPayload.escrevente_reembolso_id, atoPayload.valor_pago, atoPayload.data_pagamento, atoPayload.forma_pagamento,
       atoPayload.status, atoPayload.verificado_por, atoPayload.verificado_em,
       atoPayload.comissao_override, atoPayload.notas]
    );
    const ato = await fetchAtoById(rows[0].id);
    res.status(201).json(ato);
  } catch (e) {
    return handleAtoWriteError(e, res);
  }
});

// ── PUT /api/atos/:id ─────────────────────────────────────────────────────────
router.put('/:id', authMiddleware, async (req, res) => {
  const id = parseInt(req.params.id);
  const podeEditar = ['admin','financeiro','chefe_financeiro'].includes(req.user.perfil);
  if (!podeEditar) return res.status(403).json({ erro: 'Permissão insuficiente' });

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { rows: currentRows } = await client.query(
      'SELECT id, verificado_por, verificado_em FROM atos WHERE id=$1',
      [id]
    );
    if (!currentRows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ erro: 'Ato não encontrado' });
    }

    const atoPayload = normalizeAtoPayload(req.body, currentRows[0]);
    const validationError = validateAtoPayload(atoPayload);
    if (validationError) {
      await client.query('ROLLBACK');
      return res.status(400).json({ erro: validationError });
    }

    await client.query(`
      UPDATE atos SET
        controle=$1,livro=$2,pagina=$3,data_ato=$4,captador_id=$5,executor_id=$6,signatario_id=$7,
        emolumentos=$8,repasses=$9,issqn=$10,reembolso_tabeliao=$11,reembolso_escrevente=$12,
        escrevente_reembolso_id=$13,valor_pago=$14,data_pagamento=$15,forma_pagamento=$16,
        status=$17,verificado_por=$18,verificado_em=$19,comissao_override=$20,notas=$21
      WHERE id=$22`,
      [atoPayload.controle, atoPayload.livro, atoPayload.pagina,
       atoPayload.data_ato, atoPayload.captador_id, atoPayload.executor_id, atoPayload.signatario_id,
       atoPayload.emolumentos, atoPayload.repasses, atoPayload.issqn, atoPayload.reembolso_tabeliao, atoPayload.reembolso_escrevente,
       atoPayload.escrevente_reembolso_id, atoPayload.valor_pago, atoPayload.data_pagamento, atoPayload.forma_pagamento,
       atoPayload.status, atoPayload.verificado_por, atoPayload.verificado_em,
       atoPayload.comissao_override, atoPayload.notas, id]
    );
    // Sincroniza correções
    if (Array.isArray(req.body.correcoes)) {
      const { rows: currentCorrecoes } = await client.query(
        'SELECT id, data FROM correcoes WHERE ato_id=$1',
        [id]
      );
      const currentCorrecoesById = new Map(currentCorrecoes.map((row) => [String(row.id), row]));

      await client.query('DELETE FROM correcoes WHERE ato_id=$1', [id]);
      for (const c of req.body.correcoes) {
        await client.query(
          'INSERT INTO correcoes(ato_id,autor,autor_id,mensagem,data,status) VALUES($1,$2,$3,$4,$5,$6)',
          [
            id,
            normalizeNullableString(c.autor) || 'Financeiro',
            c.autor_id||null,
            c.msg||c.mensagem,
            resolveHistoricDate(c, currentCorrecoesById),
            c.status||'aguardando',
          ]
        );
      }
    }
    await client.query('COMMIT');
    const ato = await fetchAtoById(id);
    res.json(ato);
  } catch (e) {
    await client.query('ROLLBACK');
    return handleAtoWriteError(e, res);
  } finally { client.release(); }
});

module.exports = router;
