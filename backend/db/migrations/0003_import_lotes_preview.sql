CREATE TABLE IF NOT EXISTS import_lotes (
  id                  SERIAL PRIMARY KEY,
  tipo                VARCHAR(50) NOT NULL DEFAULT 'controle_diario_xlsx',
  arquivo_nome        VARCHAR(255) NOT NULL,
  arquivo_sha256      VARCHAR(64) NOT NULL,
  sheet_name          VARCHAR(255) NOT NULL,
  headers             JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_linhas        INTEGER NOT NULL DEFAULT 0,
  linhas_validas      INTEGER NOT NULL DEFAULT 0,
  linhas_com_erro     INTEGER NOT NULL DEFAULT 0,
  linhas_com_alerta   INTEGER NOT NULL DEFAULT 0,
  summary             JSONB NOT NULL DEFAULT '{}'::jsonb,
  status              VARCHAR(20) NOT NULL DEFAULT 'preview'
                        CHECK (status IN ('preview','importado','cancelado')),
  uploaded_by_user_id INTEGER REFERENCES usuarios(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS import_linhas (
  id              SERIAL PRIMARY KEY,
  lote_id         INTEGER NOT NULL REFERENCES import_lotes(id) ON DELETE CASCADE,
  numero_linha    INTEGER NOT NULL,
  raw_data        JSONB NOT NULL DEFAULT '{}'::jsonb,
  normalized_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  errors          JSONB NOT NULL DEFAULT '[]'::jsonb,
  warnings        JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_lotes_created_at
  ON import_lotes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_lotes_uploaded_by
  ON import_lotes(uploaded_by_user_id);
CREATE INDEX IF NOT EXISTS idx_import_linhas_lote
  ON import_linhas(lote_id, numero_linha);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_import_lotes_updated_at') THEN
    CREATE TRIGGER trg_import_lotes_updated_at
      BEFORE UPDATE ON import_lotes
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
