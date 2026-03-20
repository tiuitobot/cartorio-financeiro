ALTER TABLE pagamentos_reembolso
  ADD COLUMN IF NOT EXISTS confirmado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contestado_escrevente BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS contestacao_justificativa TEXT,
  ADD COLUMN IF NOT EXISTS contestado_em TIMESTAMPTZ;
