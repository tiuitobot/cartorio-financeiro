INSERT INTO pagamentos_ato(
  ato_id,
  valor,
  data_pagamento,
  forma_pagamento,
  notas,
  confirmado_financeiro,
  confirmado_financeiro_por,
  confirmado_financeiro_em
)
SELECT
  a.id,
  a.valor_pago,
  a.data_pagamento,
  a.forma_pagamento,
  'Backfill tardio do modelo legado de pagamento único',
  (a.verificado_por IS NOT NULL),
  CASE
    WHEN a.verificado_por IS NOT NULL THEN a.verificado_por
    ELSE NULL
  END,
  CASE
    WHEN a.verificado_por IS NOT NULL AND a.verificado_em ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$'
      THEN to_timestamp(a.verificado_em, 'DD/MM/YYYY')
    WHEN a.verificado_por IS NOT NULL AND a.data_pagamento IS NOT NULL
      THEN (a.data_pagamento::timestamp AT TIME ZONE 'America/Sao_Paulo')
    ELSE NULL
  END
FROM atos a
WHERE a.valor_pago > 0
  AND NOT EXISTS (
    SELECT 1
      FROM pagamentos_ato p
     WHERE p.ato_id = a.id
  );

UPDATE atos a
   SET data_pagamento = NULL,
       forma_pagamento = NULL,
       verificado_por = NULL,
       verificado_em = NULL
 WHERE COALESCE(a.valor_pago, 0) <= 0
   AND NOT EXISTS (
     SELECT 1
       FROM pagamentos_ato p
      WHERE p.ato_id = a.id
   )
   AND (
     a.data_pagamento IS NOT NULL
     OR a.forma_pagamento IS NOT NULL
     OR a.verificado_por IS NOT NULL
     OR a.verificado_em IS NOT NULL
   );
