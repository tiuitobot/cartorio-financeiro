ALTER TABLE atos
  ALTER COLUMN controle TYPE VARCHAR(20) USING controle::varchar;

ALTER TABLE atos
  DROP CONSTRAINT IF EXISTS chk_atos_controle_formato;

ALTER TABLE atos
  ADD CONSTRAINT chk_atos_controle_formato CHECK (controle ~ '^[0-9]{1,20}$');

ALTER TABLE atos
  ADD COLUMN IF NOT EXISTS tipo_ato VARCHAR(255),
  ADD COLUMN IF NOT EXISTS controle_cheques VARCHAR(255);

DROP INDEX IF EXISTS ux_atos_controle_valido;
CREATE UNIQUE INDEX IF NOT EXISTS ux_atos_controle_valido
  ON atos(controle)
  WHERE controle <> '00000';

ALTER TABLE import_lotes
  DROP CONSTRAINT IF EXISTS import_lotes_status_check;

ALTER TABLE import_lotes
  ADD CONSTRAINT import_lotes_status_check
  CHECK (status IN ('preview','importado','importado_parcial','cancelado','falha'));
