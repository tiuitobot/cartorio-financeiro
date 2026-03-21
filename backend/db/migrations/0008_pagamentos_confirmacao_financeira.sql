ALTER TABLE pagamentos_ato
  ADD COLUMN IF NOT EXISTS confirmado_financeiro BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS confirmado_financeiro_por VARCHAR(255),
  ADD COLUMN IF NOT EXISTS confirmado_financeiro_em TIMESTAMPTZ;

UPDATE pagamentos_ato
   SET confirmado_financeiro = true,
       confirmado_financeiro_por = COALESCE(confirmado_financeiro_por, 'Backfill do ato'),
       confirmado_financeiro_em = COALESCE(
         confirmado_financeiro_em,
         CASE
           WHEN a.verificado_em ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$'
             THEN to_timestamp(a.verificado_em, 'DD/MM/YYYY')
           WHEN a.data_pagamento IS NOT NULL
             THEN (a.data_pagamento::timestamp AT TIME ZONE 'America/Sao_Paulo')
           ELSE NOW()
         END
       )
  FROM atos a
 WHERE pagamentos_ato.ato_id = a.id
   AND a.verificado_por IS NOT NULL
   AND pagamentos_ato.confirmado_financeiro = false;

CREATE INDEX IF NOT EXISTS idx_pagamentos_ato_confirmacao
  ON pagamentos_ato(ato_id, confirmado_financeiro, confirmado_financeiro_em);
