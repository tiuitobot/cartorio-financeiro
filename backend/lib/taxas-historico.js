const HISTORICO_TAXA_BASE_DATE = '1900-01-01';

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeVigenciaInicio(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);

  const text = String(value).trim();
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

async function upsertTaxaHistorico(client, {
  escreventeId,
  taxa,
  vigenciaInicio,
  createdByUserId = null,
}) {
  await client.query(
    `INSERT INTO escreventes_taxas_historico(
       escrevente_id, taxa, vigencia_inicio, created_by_user_id
     ) VALUES($1,$2,$3,$4)
     ON CONFLICT (escrevente_id, vigencia_inicio)
     DO UPDATE SET
       taxa = EXCLUDED.taxa,
       created_by_user_id = EXCLUDED.created_by_user_id`,
    [escreventeId, taxa, vigenciaInicio, createdByUserId]
  );
}

async function ensureTaxaHistoricoBaseline(client, {
  escreventeId,
  fallbackTaxa = null,
  createdByUserId = null,
}) {
  const { rows } = await client.query(
    `SELECT 1
       FROM escreventes_taxas_historico
      WHERE escrevente_id = $1
        AND vigencia_inicio = $2
      LIMIT 1`,
    [escreventeId, HISTORICO_TAXA_BASE_DATE]
  );

  if (rows[0]) return false;

  const { rows: oldestRows } = await client.query(
    `SELECT taxa
       FROM escreventes_taxas_historico
      WHERE escrevente_id = $1
      ORDER BY created_at ASC, id ASC
      LIMIT 1`,
    [escreventeId]
  );

  const taxa = Number.parseInt(oldestRows[0]?.taxa ?? fallbackTaxa, 10);
  if (!taxa) return false;

  await upsertTaxaHistorico(client, {
    escreventeId,
    taxa,
    vigenciaInicio: HISTORICO_TAXA_BASE_DATE,
    createdByUserId,
  });
  return true;
}

async function fetchEffectiveTaxaAtDate(client, escreventeId, referenceDate, fallbackTaxa = null) {
  const normalizedDate = normalizeVigenciaInicio(referenceDate) || todayDateString();
  const { rows } = await client.query(
    `SELECT taxa
       FROM escreventes_taxas_historico
      WHERE escrevente_id = $1
      ORDER BY
        CASE WHEN vigencia_inicio <= $2 THEN 0 ELSE 1 END,
        CASE WHEN vigencia_inicio <= $2 THEN vigencia_inicio END DESC NULLS LAST,
        CASE WHEN vigencia_inicio > $2 THEN created_at END ASC NULLS LAST,
        CASE WHEN vigencia_inicio > $2 THEN id END ASC NULLS LAST
      LIMIT 1`,
    [escreventeId, normalizedDate]
  );

  if (rows[0]) return Number.parseInt(rows[0].taxa, 10);
  return Number.parseInt(fallbackTaxa, 10) || null;
}

module.exports = {
  HISTORICO_TAXA_BASE_DATE,
  todayDateString,
  normalizeVigenciaInicio,
  upsertTaxaHistorico,
  ensureTaxaHistoricoBaseline,
  fetchEffectiveTaxaAtDate,
};
