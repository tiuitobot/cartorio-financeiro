CREATE TABLE IF NOT EXISTS pagamentos_ato (
  id              SERIAL PRIMARY KEY,
  ato_id          INTEGER NOT NULL REFERENCES atos(id) ON DELETE CASCADE,
  valor           DECIMAL(12,2) NOT NULL,
  data_pagamento  DATE,
  forma_pagamento VARCHAR(50),
  notas           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_pagamentos_ato_valor_positivo CHECK (valor > 0)
);

CREATE INDEX IF NOT EXISTS idx_pagamentos_ato_ato ON pagamentos_ato(ato_id, data_pagamento, id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_pagamentos_ato_updated_at') THEN
    CREATE TRIGGER trg_pagamentos_ato_updated_at
      BEFORE UPDATE ON pagamentos_ato
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

INSERT INTO pagamentos_ato(ato_id, valor, data_pagamento, forma_pagamento, notas)
SELECT
  a.id,
  a.valor_pago,
  a.data_pagamento,
  a.forma_pagamento,
  'Backfill do modelo legado de pagamento único'
FROM atos a
WHERE a.valor_pago > 0
  AND NOT EXISTS (
    SELECT 1
    FROM pagamentos_ato p
    WHERE p.ato_id = a.id
  );
