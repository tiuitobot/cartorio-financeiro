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

async function fetchLoteById(loteId, queryable = db) {
  const { rows } = await queryable.query(
    `SELECT il.*, u.nome AS uploaded_by_nome
       FROM import_lotes il
       LEFT JOIN usuarios u ON u.id = il.uploaded_by_user_id
      WHERE il.id = $1`,
    [loteId]
  );
  return rows[0] || null;
}

function inferValorPago(normalized) {
  const total = totalAto({
    emolumentos: normalized.emolumentos,
    repasses: normalized.repasses,
    issqn: normalized.issqn,
    reembolso_tabeliao: 0,
    reembolso_escrevente: 0,
  });

  if (normalized.data_pagamento || normalized.confirmacao_recebimento_em) {
    return total;
  }

  return 0;
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
  return rows[0];
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
        continue;
      }

      const captadorKey = normalizeKey(normalized.escrevente_nome);
      if (!captadorKey) {
        result.skipped += 1;
        result.errors.push({
          numero_linha: row.numero_linha,
          motivos: ['ESCREVENTE ausente para mapear captador'],
        });
        continue;
      }

      if (ambiguousCaptadores.has(captadorKey)) {
        result.skipped += 1;
        result.errors.push({
          numero_linha: row.numero_linha,
          motivos: [`Nome de escrevente ambíguo no cadastro: ${normalized.escrevente_nome}`],
        });
        continue;
      }

      const captador = captadoresByKey.get(captadorKey);
      if (!captador && !options.autoCreateMissingEscreventes) {
        result.skipped += 1;
        result.errors.push({
          numero_linha: row.numero_linha,
          motivos: [`Escrevente não cadastrado: ${normalized.escrevente_nome}`],
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
      const valorPago = inferValorPago(normalized);
      const status = calcStatus(normalized.emolumentos, repasses, issqn, 0, 0, valorPago);
      const notasImportacao = [
        `Importado da planilha controle diário (lote ${loteId}, linha ${row.numero_linha})`,
        `Captador mapeado de ESCREVENTE: ${captadorResolvido.nome}`,
      ];
      if (createdByKey.has(captadorKey)) {
        notasImportacao.push(
          `escrevente criado automaticamente na importação com taxa ${captadorResolvido.taxa}%`
        );
      }
      if (normalized.data_pagamento || normalized.confirmacao_recebimento_em) {
        notasImportacao.push('valor_pago inferido automaticamente a partir do sinal de quitação na planilha');
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
            valorPago,
            normalized.data_pagamento,
            normalized.forma_pagamento,
            normalized.controle_cheques,
            status,
            null,
            null,
            null,
            notasImportacao.join('. '),
          ]
        );
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
