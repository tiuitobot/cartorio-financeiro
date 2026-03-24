CREATE TABLE IF NOT EXISTS despesas_registro (
  id                SERIAL PRIMARY KEY,
  controle_ref      VARCHAR(20) NOT NULL,
  data_registro     DATE NOT NULL,
  valor             DECIMAL(12,2) NOT NULL CHECK (valor > 0),
  descricao         TEXT NOT NULL,
  cartorio_nome     VARCHAR(255),
  protocolo         VARCHAR(120),
  observacoes       TEXT,
  criado_por_user_id INTEGER REFERENCES usuarios(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_despesas_registro_controle_ref
  ON despesas_registro(controle_ref, data_registro DESC);

CREATE INDEX IF NOT EXISTS idx_despesas_registro_created_at
  ON despesas_registro(created_at DESC);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_despesas_registro_updated_at') THEN
    CREATE TRIGGER trg_despesas_registro_updated_at
      BEFORE UPDATE ON despesas_registro
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
