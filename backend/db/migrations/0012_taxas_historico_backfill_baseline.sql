INSERT INTO escreventes_taxas_historico(
  escrevente_id,
  taxa,
  vigencia_inicio,
  created_by_user_id,
  created_at
)
SELECT
  e.id,
  COALESCE(oldest_hist.taxa, e.taxa),
  DATE '1900-01-01',
  oldest_hist.created_by_user_id,
  COALESCE(oldest_hist.created_at, NOW())
FROM escreventes e
LEFT JOIN LATERAL (
  SELECT
    h.taxa,
    h.created_by_user_id,
    h.created_at
  FROM escreventes_taxas_historico h
  WHERE h.escrevente_id = e.id
  ORDER BY h.created_at ASC, h.id ASC
  LIMIT 1
) oldest_hist ON TRUE
WHERE NOT EXISTS (
  SELECT 1
  FROM escreventes_taxas_historico h0
  WHERE h0.escrevente_id = e.id
    AND h0.vigencia_inicio = DATE '1900-01-01'
);
