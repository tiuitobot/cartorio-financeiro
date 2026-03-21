#!/usr/bin/env node
const db = require('../db');
const {
  createReembolsoContestacaoPendencia,
  syncAutomaticPendenciasForAtoId,
  upsertOpenPendencia,
  normalizeControle,
} = require('../lib/pendencias');

async function main() {
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const atosResult = await client.query('SELECT id FROM atos ORDER BY id');
    let syncedAtos = 0;
    for (const row of atosResult.rows) {
      await syncAutomaticPendenciasForAtoId(client, row.id, { actorUserId: null });
      syncedAtos += 1;
    }

    const reembolsosResult = await client.query(
      `SELECT id, escrevente_id, contestacao_justificativa
         FROM pagamentos_reembolso
        WHERE contestado_escrevente = true`
    );
    for (const row of reembolsosResult.rows) {
      await createReembolsoContestacaoPendencia(client, {
        pagamento: row,
        user: { id: null, escrevente_id: row.escrevente_id },
        justificativa: row.contestacao_justificativa,
      });
    }

    const reivindicacoesResult = await client.query(
      `SELECT r.id, r.ato_id, r.escrevente_id, r.funcao, r.justificativa, a.controle, a.data_ato
         FROM reivindicacoes r
         LEFT JOIN atos a ON a.id = r.ato_id
        WHERE r.status = 'contestada'`
    );
    for (const row of reivindicacoesResult.rows) {
      if (!row.ato_id) continue;
      await upsertOpenPendencia(client, {
        ato_id: row.ato_id,
        tipo: 'manifestacao_escrevente',
        descricao: `Contestação de reivindicação para ${row.funcao}: ${row.justificativa || 'sem justificativa informada'}`,
        escrevente_id: row.escrevente_id,
        origem: 'escrevente',
        controle_ref: normalizeControle(row.controle),
        data_ato_ref: row.data_ato,
        chave_unica: `reivindicacao:${row.id}:contestada`,
        metadata: {
          reivindicacao_id: row.id,
          funcao: row.funcao,
          justificativa: row.justificativa || null,
        },
      });
    }

    await client.query('COMMIT');
    console.log(`✓ pendências sincronizadas para ${syncedAtos} ato(s)`);
    console.log(`  contestações de reembolso sincronizadas: ${reembolsosResult.rows.length}`);
    console.log(`  reivindicações contestadas sincronizadas: ${reivindicacoesResult.rows.length}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

main()
  .catch((error) => {
    console.error('✗ falha ao sincronizar pendências:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.end().catch(() => {});
  });
