CREATE TABLE IF NOT EXISTS escreventes_taxas_historico (
  id                 SERIAL PRIMARY KEY,
  escrevente_id      INTEGER NOT NULL REFERENCES escreventes(id) ON DELETE CASCADE,
  taxa               INTEGER NOT NULL CHECK (taxa IN (6, 20, 30)),
  vigencia_inicio    DATE NOT NULL,
  created_by_user_id INTEGER,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ux_escreventes_taxas_historico UNIQUE (escrevente_id, vigencia_inicio)
);

CREATE INDEX IF NOT EXISTS idx_escreventes_taxas_historico_lookup
  ON escreventes_taxas_historico(escrevente_id, vigencia_inicio DESC, id DESC);

INSERT INTO escreventes_taxas_historico(escrevente_id, taxa, vigencia_inicio, created_at)
SELECT e.id, e.taxa, DATE '1900-01-01', NOW()
  FROM escreventes e
 WHERE NOT EXISTS (
   SELECT 1
     FROM escreventes_taxas_historico h
    WHERE h.escrevente_id = e.id
 );
