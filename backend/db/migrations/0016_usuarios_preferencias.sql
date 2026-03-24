CREATE TABLE IF NOT EXISTS usuarios_preferencias (
  user_id      INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  preferencias JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_usuarios_preferencias_updated_at') THEN
    CREATE TRIGGER trg_usuarios_preferencias_updated_at
    BEFORE UPDATE ON usuarios_preferencias
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
