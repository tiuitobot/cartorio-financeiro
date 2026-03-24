const router = require('express').Router();
const multer = require('multer');
const db = require('../db');
const { authMiddleware, requirePerfil } = require('../middleware/auth');
const { calcStatus, totalAto } = require('../lib/finance');
const {
  ImportValidationError,
  buildWorkbookPreview,
  normalizeKey,
} = require('../lib/controle-diario-import');
const { replacePagamentosAto } = require('../lib/pagamentos');
const {
  HISTORICO_TAXA_BASE_DATE,
  upsertTaxaHistorico,
} = require('../lib/taxas-historico');
const {
  createImportIssuePendencia,
  normalizeControle,
  syncAutomaticPendenciasForAtoId,
} = require('../lib/pendencias');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

async function persistPreview(preview, uploadedByUserId) {
  const client = await db.connect();

  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO import_lotes(
        tipo,arquivo_nome,arquivo_sha256,sheet_name,headers,total_linhas,linhas_validas,
        linhas_com_erro,linhas_com_alerta,summary,status,uploaded_by_user_id
      ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id`,
      [
        'controle_diario_xlsx',
        preview.file_name,
        preview.file_sha256,
        preview.sheet_name,
        JSON.stringify(preview.headers),
        preview.summary.total_rows,
        preview.summary.valid_rows,
        preview.summary.rows_with_errors,
        preview.summary.rows_with_warnings,
        JSON.stringify(preview.summary),
        'preview',
        uploadedByUserId,
      ]
    );

    const loteId = rows[0].id;
    for (const row of preview.rows) {
      await client.query(
        `INSERT INTO import_linhas(
          lote_id,numero_linha,raw_data,normalized_data,errors,warnings
        ) VALUES($1,$2,$3,$4,$5,$6)`,
        [
          loteId,
          row.row_number,
          JSON.stringify(row.raw),
          JSON.stringify(row.normalized),
          JSON.stringify(row.errors),
          JSON.stringify(row.warnings),
        ]
      );
    }

    await client.query('COMMIT');
    return loteId;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function fetchLoteById(loteId, queryable = db, { forUpdate = false } = {}) {
  if (forUpdate) {
    const { rows } = await queryable.query(
      `SELECT *
         FROM import_lotes
        WHERE id = $1
        FOR UPDATE`,
      [loteId]
    );
    return rows[0] || null;
  }

  const { rows } = await queryable.query(
    `SELECT il.*, u.nome AS uploaded_by_nome
       FROM import_lotes il
       LEFT JOIN usuarios u ON u.id = il.uploaded_by_user_id
      WHERE il.id = $1`,
    [loteId]
  );
  return rows[0] || null;
}

function toIntList(values) {
  if (!Array.isArray(values)) return [];

  return [...new Set(
    values
      .map((value) => Number.parseInt(value, 10))
      .filter((value) => Number.isInteger(value) && value > 0)
  )];
}

function extractImportResult(summary = {}) {
  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) {
    return null;
  }

  const importResult = summary.import_result;
  if (!importResult || typeof importResult !== 'object' || Array.isArray(importResult)) {
    return null;
  }

  return importResult;
}

function extractCreatedEscreventeIds(importResult = {}) {
  if (!Array.isArray(importResult.created_escreventes)) return [];

  return toIntList(
    importResult.created_escreventes.map((item) =>
      typeof item === 'object' && item !== null ? item.id : item
    )
  );
}

async function findEscreventeBlockingRefs(client, escreventeId) {
  const { rows } = await client.query(
    `SELECT
       EXISTS(SELECT 1 FROM usuarios WHERE escrevente_id = $1) AS tem_usuarios,
       EXISTS(SELECT 1 FROM pagamentos_reembolso WHERE escrevente_id = $1) AS tem_reembolsos,
       EXISTS(SELECT 1 FROM reivindicacoes WHERE escrevente_id = $1) AS tem_reivindicacoes,
       EXISTS(
         SELECT 1
           FROM atos
          WHERE captador_id = $1
             OR executor_id = $1
             OR signatario_id = $1
             OR escrevente_reembolso_id = $1
       ) AS tem_atos`,
    [escreventeId]
  );

  const row = rows[0] || {};
  const refs = [];
  if (row.tem_usuarios) refs.push('usuários');
  if (row.tem_reembolsos) refs.push('reembolsos');
  if (row.tem_reivindicacoes) refs.push('reivindicações');
  if (row.tem_atos) refs.push('atos');
  return refs;
}

async function deleteImportedEscreventesIfOrphan(client, importResult) {
  const ids = extractCreatedEscreventeIds(importResult || {});
  if (!ids.length) return { deleted: [], skipped: [] };

  const deleted = [];
  const skipped = [];

  // Batch fetch all escreventes in one query
  const { rows: existingRows } = await client.query(
    'SELECT id, nome, taxa FROM escreventes WHERE id = ANY($1::int[])',
    [ids]
  );
  const existingMap = new Map(existingRows.map((r) => [r.id, r]));

  for (const escreventeId of ids) {
    const row = existingMap.get(escreventeId);
    if (!row) {
      skipped.push({
        id: escreventeId,
        nome: null,
        motivo: 'escrevente já não existe mais no banco',
      });
      continue;
    }

    // findEscreventeBlockingRefs runs a single multi-table EXISTS query per id;
    // batching further would require a more complex CTE — keep per-id for clarity.
    const blockingRefs = await findEscreventeBlockingRefs(client, escreventeId);
    if (blockingRefs.length) {
      skipped.push({
        id: row.id,
        nome: row.nome,
        motivo: `preservado por ainda possuir referência em ${blockingRefs.join(', ')}`,
      });
      continue;
    }

    const deletedResult = await client.query(
      'DELETE FROM escreventes WHERE id = $1 RETURNING id, nome, taxa',
      [escreventeId]
    );

    if (deletedResult.rows[0]) {
      deleted.push(deletedResult.rows[0]);
    }
  }

  return { deleted, skipped };
}

async function deleteLoteAndRollback(loteId, actorUserId) {
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const lote = await fetchLoteById(loteId, client, { forUpdate: true });
    if (!lote) {
      await client.query('ROLLBACK');
      return { notFound: true };
    }

    const importResult = extractImportResult(lote.summary || {});
    const importedIds = toIntList(importResult?.imported_ids || []);
    const importedCount = Number.parseInt(importResult?.imported || 0, 10) || 0;

    if (['importado', 'importado_parcial'].includes(lote.status) && importedCount > 0 && importedIds.length === 0) {
      await client.query('ROLLBACK');
      return { rollbackUnavailable: true, lote };
    }

    const linhasCountResult = await client.query(
      'SELECT COUNT(*)::int AS total FROM import_linhas WHERE lote_id = $1',
      [loteId]
    );
    const deletedLinhas = linhasCountResult.rows[0]?.total || 0;

    let deletedAtos = [];
    if (importedIds.length > 0) {
      const deleteAtosResult = await client.query(
        'DELETE FROM atos WHERE id = ANY($1::int[]) RETURNING id',
        [importedIds]
      );
      deletedAtos = deleteAtosResult.rows.map((row) => row.id);
    }

    const escreventesResult = await deleteImportedEscreventesIfOrphan(client, importResult);

    await client.query(
      'DELETE FROM import_lotes WHERE id = $1',
      [loteId]
    );

    await client.query('COMMIT');
    return {
      lote_id: loteId,
      deleted: true,
      status_anterior: lote.status,
      deleted_linhas: deletedLinhas,
      deleted_imported_atos: deletedAtos.length,
      deleted_imported_ato_ids: deletedAtos,
      deleted_created_escreventes: escreventesResult.deleted,
      skipped_created_escreventes: escreventesResult.skipped,
      deleted_by_user_id: actorUserId,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function cancelLote(loteId, actorUserId) {
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const lote = await fetchLoteById(loteId, client, { forUpdate: true });
    if (!lote) {
      await client.query('ROLLBACK');
      return { notFound: true };
    }

    if (lote.status === 'cancelado') {
      await client.query('COMMIT');
      return {
        lote_id: loteId,
        status: 'cancelado',
        alreadyCancelled: true,
        summary: lote.summary || {},
      };
    }

    if (lote.status !== 'preview') {
      await client.query('ROLLBACK');
      return { invalidStatus: true, lote };
    }

    const summary = {
      ...(lote.summary || {}),
      cancel_result: {
        cancelled_by_user_id: actorUserId,
        cancelled_at: new Date().toISOString(),
      },
    };

    await client.query(
      `UPDATE import_lotes
          SET status = 'cancelado',
              summary = $2,
              updated_at = NOW()
        WHERE id = $1`,
      [loteId, JSON.stringify(summary)]
    );

    await client.query('COMMIT');
    return {
      lote_id: loteId,
      status: 'cancelado',
      alreadyCancelled: false,
      summary,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function inferPagamentoImportado(normalized) {
  const total = totalAto({
    emolumentos: normalized.emolumentos,
    repasses: normalized.repasses,
    issqn: normalized.issqn,
    reembolso_tabeliao: 0,
    reembolso_escrevente: 0,
  });

  const lancado = normalized.data_pagamento || normalized.confirmacao_recebimento_em ? total : 0;
  const confirmado = normalized.confirmacao_recebimento_em ? total : 0;

  return {
    lancado,
    confirmado,
    confirmado_financeiro: Boolean(normalized.confirmacao_recebimento_em),
  };
}

async function buildCaptadorMap(client) {
  const { rows } = await client.query(
    'SELECT id, nome, taxa, ativo FROM escreventes WHERE ativo = true ORDER BY nome'
  );

  const byKey = new Map();
  const ambiguous = new Set();

  rows.forEach((row) => {
    const key = normalizeKey(row.nome);
    if (!key) return;
    if (byKey.has(key)) {
      ambiguous.add(key);
      return;
    }
    byKey.set(key, row);
  });

  ambiguous.forEach((key) => byKey.delete(key));
  return { byKey, ambiguous };
}

function parseImportOptions(body = {}) {
  const autoCreateMissingEscreventes =
    body.auto_criar_escreventes === true || body.autoCreateMissingEscreventes === true;

  const defaultTaxa = Number.parseInt(
    body.taxa_padrao_novos_escreventes ?? body.defaultTaxa ?? 20,
    10
  );

  if (![6, 20, 30].includes(defaultTaxa)) {
    return { invalid: true };
  }

  return {
    autoCreateMissingEscreventes,
    defaultTaxa,
  };
}

async function createEscreventeForImport(client, nome, taxa) {
  const { rows } = await client.query(
    `INSERT INTO escreventes(nome, cargo, email, taxa, ativo)
     VALUES($1,$2,$3,$4,true)
     RETURNING id, nome, taxa, ativo`,
    [nome, null, null, taxa]
  );
  await upsertTaxaHistorico(client, {
    escreventeId: rows[0].id,
    taxa,
    vigenciaInicio: HISTORICO_TAXA_BASE_DATE,
    createdByUserId: null,
  });
  return rows[0];
}

async function findExistingAtoForImportIssue(client, normalized) {
  const controle = normalizeControle(normalized?.controle);
  if (controle) {
    const byControle = await client.query(
      'SELECT id, controle, livro, pagina, data_ato FROM atos WHERE controle = $1 LIMIT 1',
      [controle]
    );
    if (byControle.rows[0]) return byControle.rows[0];
  }

  const livro = String(Number.parseInt(normalized?.livro, 10) || 0);
  const pagina = String(Number.parseInt(normalized?.pagina, 10) || 0);
  if (livro !== '0' && pagina !== '0') {
    const byRef = await client.query(
      'SELECT id, controle, livro, pagina, data_ato FROM atos WHERE livro = $1 AND pagina = $2 LIMIT 1',
      [livro, pagina]
    );
    if (byRef.rows[0]) return byRef.rows[0];
  }

  return null;
}

async function registerImportIssuePendencia(client, { loteId, row, tipo, motivos, ato }) {
  const normalized = row.normalized_data || {};
  return createImportIssuePendencia(client, {
    ato_id: ato?.id || null,
    import_lote_id: loteId,
    tipo,
    descricao: `Linha ${row.numero_linha}: ${motivos.join('; ')}`,
    controle_ref: normalized.controle,
    data_ato_ref: normalized.data_ato || null,
    chave_unica: `import:${loteId}:linha:${row.numero_linha}:${tipo}`,
    metadata: {
      numero_linha: row.numero_linha,
      motivos,
      referencia: ato
        ? { ato_id: ato.id, controle: ato.controle, livro: ato.livro, pagina: ato.pagina }
        : null,
    },
  });
}

async function importLote(loteId, actorUserId, options = {}) {
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const lote = await fetchLoteById(loteId, client);
    if (!lote) {
      await client.query('ROLLBACK');
      return { notFound: true };
    }

    if (['importado', 'importado_parcial'].includes(lote.status)) {
      await client.query('ROLLBACK');
      return { alreadyImported: true, lote };
    }

    const linhasResult = await client.query(
      `SELECT id, numero_linha, normalized_data, errors, warnings
         FROM import_linhas
        WHERE lote_id = $1
        ORDER BY numero_linha`,
      [loteId]
    );

    const { byKey: captadoresByKey, ambiguous: ambiguousCaptadores } = await buildCaptadorMap(client);
    const result = {
      lote_id: loteId,
      imported: 0,
      skipped: 0,
      imported_ids: [],
      created_escreventes: [],
      errors: [],
      assumptions: [
        'ESCREVENTE da planilha foi importado como captador_id',
        'executor_id e signatario_id foram mantidos como NULL nesta rodada',
        'valor_pago foi inferido como total do ato apenas quando a planilha trouxe Data Pagamento ou Confirmacao Recebimento',
      ],
    };
    const createdByKey = new Map();

    if (options.autoCreateMissingEscreventes) {
      result.assumptions.push(
        `escreventes faltantes foram criados automaticamente com taxa padrão de ${options.defaultTaxa}%`
      );
    }

    for (const row of linhasResult.rows) {
      const normalized = row.normalized_data || {};
      const existingErrors = Array.isArray(row.errors) ? row.errors : [];

      if (existingErrors.length) {
        result.skipped += 1;
        result.errors.push({
          numero_linha: row.numero_linha,
          motivos: existingErrors,
        });
        await registerImportIssuePendencia(client, {
          loteId,
          row,
          tipo: 'informacao_incompleta',
          motivos: existingErrors,
        });
        continue;
      }

      const captadorKey = normalizeKey(normalized.escrevente_nome);
      if (!captadorKey) {
        result.skipped += 1;
        const motivos = ['ESCREVENTE ausente para mapear captador'];
        result.errors.push({
          numero_linha: row.numero_linha,
          motivos,
        });
        await registerImportIssuePendencia(client, {
          loteId,
          row,
          tipo: 'informacao_incompleta',
          motivos,
        });
        continue;
      }

      if (ambiguousCaptadores.has(captadorKey)) {
        result.skipped += 1;
        const motivos = [`Nome de escrevente ambíguo no cadastro: ${normalized.escrevente_nome}`];
        result.errors.push({
          numero_linha: row.numero_linha,
          motivos,
        });
        await registerImportIssuePendencia(client, {
          loteId,
          row,
          tipo: 'informacao_conflitante',
          motivos,
        });
        continue;
      }

      const captador = captadoresByKey.get(captadorKey);
      if (!captador && !options.autoCreateMissingEscreventes) {
        result.skipped += 1;
        const motivos = [`Escrevente não cadastrado: ${normalized.escrevente_nome}`];
        result.errors.push({
          numero_linha: row.numero_linha,
          motivos,
        });
        await registerImportIssuePendencia(client, {
          loteId,
          row,
          tipo: 'informacao_incompleta',
          motivos,
        });
        continue;
      }

      let captadorResolvido = captador;
      if (!captadorResolvido && options.autoCreateMissingEscreventes) {
        const created = await createEscreventeForImport(
          client,
          normalized.escrevente_nome,
          options.defaultTaxa
        );
        captadoresByKey.set(captadorKey, created);
        createdByKey.set(captadorKey, created);
        result.created_escreventes.push({
          id: created.id,
          nome: created.nome,
          taxa: created.taxa,
        });
        captadorResolvido = created;
      }

      const repasses = normalized.repasses ?? 0;
      const issqn = normalized.issqn ?? 0;
      const pagamentoImportado = inferPagamentoImportado(normalized);
      const status = calcStatus(normalized.emolumentos, repasses, issqn, 0, 0, pagamentoImportado.confirmado);
      const notasImportacao = [
        `Importado da planilha controle diário (lote ${loteId}, linha ${row.numero_linha})`,
        `Captador mapeado de ESCREVENTE: ${captadorResolvido.nome}`,
      ];
      if (createdByKey.has(captadorKey)) {
        notasImportacao.push(
          `escrevente criado automaticamente na importação com taxa ${captadorResolvido.taxa}%`
        );
      }
      if (pagamentoImportado.lancado > 0) {
        notasImportacao.push('pagamento lançado automaticamente a partir do sinal de quitação na planilha');
      }
      if (pagamentoImportado.confirmado_financeiro) {
        notasImportacao.push('pagamento marcado como conferido por haver Confirmação Recebimento na planilha');
      }

      try {
        await client.query('SAVEPOINT import_row');
        const insertResult = await client.query(
          `INSERT INTO atos(
             controle, livro, pagina, data_ato, tipo_ato,
             captador_id, executor_id, signatario_id,
             emolumentos, repasses, issqn,
             reembolso_tabeliao, reembolso_escrevente, escrevente_reembolso_id,
             valor_pago, data_pagamento, forma_pagamento, controle_cheques,
             status, verificado_por, verificado_em, comissao_override, notas
           ) VALUES (
             $1,$2,$3,$4,$5,
             $6,$7,$8,
             $9,$10,$11,
             $12,$13,$14,
             $15,$16,$17,$18,
             $19,$20,$21,$22,$23
           )
           RETURNING id`,
          [
            normalized.controle,
            normalized.livro,
            normalized.pagina,
            normalized.data_ato,
            normalized.tipo_ato,
            captadorResolvido.id,
            null,
            null,
            normalized.emolumentos,
            repasses,
            issqn,
            0,
            0,
            null,
            pagamentoImportado.confirmado,
            pagamentoImportado.confirmado_financeiro ? (normalized.confirmacao_recebimento_em || normalized.data_pagamento) : null,
            pagamentoImportado.confirmado_financeiro ? normalized.forma_pagamento : null,
            normalized.controle_cheques,
            status,
            pagamentoImportado.confirmado_financeiro ? 'Importação inicial' : null,
            pagamentoImportado.confirmado_financeiro ? (normalized.confirmacao_recebimento_em || normalized.data_pagamento) : null,
            null,
            notasImportacao.join('. '),
          ]
        );
        if (pagamentoImportado.lancado > 0) {
          await replacePagamentosAto(client, insertResult.rows[0].id, [{
            valor: pagamentoImportado.lancado,
            data_pagamento: normalized.data_pagamento || normalized.confirmacao_recebimento_em,
            forma_pagamento: normalized.forma_pagamento,
            notas: 'Pagamento sintetizado da importação inicial',
            confirmado_financeiro: pagamentoImportado.confirmado_financeiro,
            confirmado_financeiro_por: pagamentoImportado.confirmado_financeiro ? 'Importação inicial' : null,
            confirmado_financeiro_em: pagamentoImportado.confirmado_financeiro ? `${normalized.confirmacao_recebimento_em || normalized.data_pagamento}T12:00:00.000Z` : null,
          }]);
        }
        await syncAutomaticPendenciasForAtoId(client, insertResult.rows[0].id, { actorUserId: actorUserId || null });
        await client.query('RELEASE SAVEPOINT import_row');
        result.imported += 1;
        result.imported_ids.push(insertResult.rows[0].id);
      } catch (error) {
        await client.query('ROLLBACK TO SAVEPOINT import_row');
        result.skipped += 1;

        let motivo = 'Falha ao importar linha';
        if (error?.code === '23505') {
          if (error.constraint === 'ux_atos_controle_valido') {
            motivo = `Controle já existente no sistema: ${normalized.controle}`;
          } else if (error.constraint === 'ux_atos_livro_pagina_validos') {
            motivo = `Livro/Página já existente no sistema: ${normalized.livro}/${normalized.pagina}`;
          }
        }

        result.errors.push({
          numero_linha: row.numero_linha,
          motivos: [motivo],
        });
        const existingAto = await findExistingAtoForImportIssue(client, normalized);
        await registerImportIssuePendencia(client, {
          loteId,
          row,
          tipo: 'informacao_conflitante',
          motivos: [motivo],
          ato: existingAto,
        });
      }
    }

    const status =
      result.imported > 0
        ? (result.skipped > 0 ? 'importado_parcial' : 'importado')
        : 'falha';

    const summary = {
      ...(lote.summary || {}),
      import_result: {
        imported: result.imported,
        skipped: result.skipped,
        imported_ids: result.imported_ids,
        created_escreventes: result.created_escreventes,
        errors: result.errors,
        assumptions: result.assumptions,
        imported_by_user_id: actorUserId,
        imported_at: new Date().toISOString(),
      },
    };

    await client.query(
      `UPDATE import_lotes
          SET status = $2,
              summary = $3,
              updated_at = NOW()
        WHERE id = $1`,
      [loteId, status, JSON.stringify(summary)]
    );

    await client.query('COMMIT');
    result.status = status;
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

router.get('/', authMiddleware, requirePerfil('admin', 'financeiro', 'chefe_financeiro'), async (req, res) => {
  const limit = Math.min(Number.parseInt(req.query.limit, 10) || 20, 100);

  try {
    const { rows } = await db.query(
      `SELECT il.id, il.tipo, il.arquivo_nome, il.sheet_name, il.total_linhas, il.linhas_validas,
              il.linhas_com_erro, il.linhas_com_alerta, il.status, il.summary, il.created_at,
              u.nome AS uploaded_by_nome
         FROM import_lotes il
         LEFT JOIN usuarios u ON u.id = il.uploaded_by_user_id
        ORDER BY il.created_at DESC
        LIMIT $1`,
      [limit]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

router.get('/:id', authMiddleware, requirePerfil('admin', 'financeiro', 'chefe_financeiro'), async (req, res) => {
  const loteId = Number.parseInt(req.params.id, 10);
  const limit = Math.min(Number.parseInt(req.query.limit, 10) || 100, 500);
  const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);

  if (!Number.isInteger(loteId)) {
    return res.status(400).json({ erro: 'Lote inválido' });
  }

  try {
    const loteResult = await db.query(
      `SELECT il.id, il.tipo, il.arquivo_nome, il.arquivo_sha256, il.sheet_name, il.headers,
              il.total_linhas, il.linhas_validas, il.linhas_com_erro, il.linhas_com_alerta,
              il.status, il.summary, il.created_at, il.updated_at,
              u.nome AS uploaded_by_nome
         FROM import_lotes il
         LEFT JOIN usuarios u ON u.id = il.uploaded_by_user_id
        WHERE il.id = $1`,
      [loteId]
    );

    if (!loteResult.rows.length) {
      return res.status(404).json({ erro: 'Lote não encontrado' });
    }

    const linhasResult = await db.query(
      `SELECT id, numero_linha, raw_data, normalized_data, errors, warnings, created_at
         FROM import_linhas
        WHERE lote_id = $1
        ORDER BY numero_linha
        LIMIT $2 OFFSET $3`,
      [loteId, limit, offset]
    );

    res.json({
      lote: loteResult.rows[0],
      pagination: { limit, offset, returned: linhasResult.rows.length },
      linhas: linhasResult.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

router.post(
  '/:id/cancelar',
  authMiddleware,
  requirePerfil('admin', 'financeiro', 'chefe_financeiro'),
  async (req, res) => {
    const loteId = Number.parseInt(req.params.id, 10);

    if (!Number.isInteger(loteId)) {
      return res.status(400).json({ erro: 'Lote inválido' });
    }

    try {
      const result = await cancelLote(loteId, req.user.id);
      if (result.notFound) {
        return res.status(404).json({ erro: 'Lote não encontrado' });
      }
      if (result.invalidStatus) {
        return res.status(409).json({ erro: 'Somente lotes em preview podem ser cancelados' });
      }
      return res.status(200).json(result);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ erro: 'Erro interno' });
    }
  }
);

router.delete(
  '/:id',
  authMiddleware,
  requirePerfil('admin', 'financeiro', 'chefe_financeiro'),
  async (req, res) => {
    const loteId = Number.parseInt(req.params.id, 10);

    if (!Number.isInteger(loteId)) {
      return res.status(400).json({ erro: 'Lote inválido' });
    }

    try {
      const result = await deleteLoteAndRollback(loteId, req.user.id);
      if (result.notFound) {
        return res.status(404).json({ erro: 'Lote não encontrado' });
      }
      if (result.rollbackUnavailable) {
        return res.status(409).json({
          erro: 'Este lote não pode ser excluído automaticamente porque o rastreio dos atos importados está incompleto',
        });
      }
      return res.status(200).json(result);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ erro: 'Erro interno' });
    }
  }
);

router.post(
  '/:id/importar',
  authMiddleware,
  requirePerfil('admin', 'financeiro', 'chefe_financeiro'),
  async (req, res) => {
    const loteId = Number.parseInt(req.params.id, 10);
    const importOptions = parseImportOptions(req.body || {});

    if (!Number.isInteger(loteId)) {
      return res.status(400).json({ erro: 'Lote inválido' });
    }
    if (importOptions.invalid) {
      return res.status(400).json({ erro: 'Taxa padrão inválida. Use 6, 20 ou 30.' });
    }

    try {
      const result = await importLote(loteId, req.user.id, importOptions);
      if (result.notFound) {
        return res.status(404).json({ erro: 'Lote não encontrado' });
      }
      if (result.alreadyImported) {
        return res.status(409).json({ erro: 'Este lote já foi importado' });
      }
      return res.status(200).json(result);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ erro: 'Erro interno' });
    }
  }
);

router.post(
  '/planilha/preview',
  authMiddleware,
  requirePerfil('admin', 'financeiro', 'chefe_financeiro'),
  upload.single('arquivo'),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ erro: 'Arquivo .xlsx é obrigatório no campo "arquivo"' });
    }

    try {
      const preview = buildWorkbookPreview(req.file.buffer, req.file.originalname);
      const loteId = await persistPreview(preview, req.user.id);
      res.status(201).json({
        lote_id: loteId,
        arquivo_nome: preview.file_name,
        sheet_name: preview.sheet_name,
        headers: preview.headers,
        summary: preview.summary,
        preview_rows: preview.rows.slice(0, 100),
        preview_truncated: preview.rows.length > 100,
      });
    } catch (error) {
      if (error instanceof ImportValidationError) {
        return res.status(422).json({
          erro: error.message,
          detalhes: error.details,
        });
      }

      console.error(error);
      return res.status(500).json({ erro: 'Erro interno' });
    }
  }
);

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ erro: `Falha no upload: ${error.message}` });
  }
  return next(error);
});

module.exports = router;
