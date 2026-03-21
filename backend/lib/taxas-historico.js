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

async function fetchEffectiveTaxaAtDate(client, escreventeId, referenceDate, fallbackTaxa = null) {
  const normalizedDate = normalizeVigenciaInicio(referenceDate) || todayDateString();
  const { rows } = await client.query(
    `SELECT taxa
       FROM escreventes_taxas_historico
      WHERE escrevente_id = $1
        AND vigencia_inicio <= $2
      ORDER BY vigencia_inicio DESC, id DESC
      LIMIT 1`,
    [escreventeId, normalizedDate]
  );

  if (rows[0]) return Number.parseInt(rows[0].taxa, 10);
  return Number.parseInt(fallbackTaxa, 10) || null;
}

module.exports = {
  todayDateString,
  normalizeVigenciaInicio,
  upsertTaxaHistorico,
  fetchEffectiveTaxaAtDate,
};
