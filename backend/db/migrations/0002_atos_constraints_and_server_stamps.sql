DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_atos_controle_formato'
  ) THEN
    ALTER TABLE atos
      ADD CONSTRAINT chk_atos_controle_formato
      CHECK (controle ~ '^[0-9]{5}$') NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_atos_livro_digitos'
  ) THEN
    ALTER TABLE atos
      ADD CONSTRAINT chk_atos_livro_digitos
      CHECK (livro ~ '^[0-9]+$') NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_atos_pagina_digitos'
  ) THEN
    ALTER TABLE atos
      ADD CONSTRAINT chk_atos_pagina_digitos
      CHECK (pagina ~ '^[0-9]+$') NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_atos_valores_nao_negativos'
  ) THEN
    ALTER TABLE atos
      ADD CONSTRAINT chk_atos_valores_nao_negativos
      CHECK (
        emolumentos >= 0
        AND repasses >= 0
        AND issqn >= 0
        AND reembolso_tabeliao >= 0
        AND reembolso_escrevente >= 0
        AND valor_pago >= 0
      ) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_atos_reembolso_escrevente_vinculo'
  ) THEN
    ALTER TABLE atos
      ADD CONSTRAINT chk_atos_reembolso_escrevente_vinculo
      CHECK (
        (reembolso_escrevente <= 0 AND escrevente_reembolso_id IS NULL)
        OR (reembolso_escrevente > 0 AND escrevente_reembolso_id IS NOT NULL)
      ) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_pagamentos_reembolso_valor_positivo'
  ) THEN
    ALTER TABLE pagamentos_reembolso
      ADD CONSTRAINT chk_pagamentos_reembolso_valor_positivo
      CHECK (valor > 0) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT controle
    FROM atos
    WHERE controle <> '00000'
    GROUP BY controle
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Não foi possível aplicar ux_atos_controle_valido: existem controles duplicados fora do placeholder 00000.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_atos_controle_valido
  ON atos(controle)
  WHERE controle <> '00000';

DO $$ BEGIN
  IF EXISTS (
    SELECT livro, pagina
    FROM atos
    WHERE livro <> '0' AND pagina <> '0'
    GROUP BY livro, pagina
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Não foi possível aplicar ux_atos_livro_pagina_validos: existem referências duplicadas de livro e página fora do placeholder 0/0.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_atos_livro_pagina_validos
  ON atos(livro, pagina)
  WHERE livro <> '0' AND pagina <> '0';
