DELETE FROM pagamentos_ato
 WHERE valor <= 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'chk_pagamentos_ato_valor_positivo'
  ) THEN
    ALTER TABLE pagamentos_ato
      ADD CONSTRAINT chk_pagamentos_ato_valor_positivo
      CHECK (valor > 0) NOT VALID;
  END IF;
END $$;

ALTER TABLE pagamentos_ato
  VALIDATE CONSTRAINT chk_pagamentos_ato_valor_positivo;
