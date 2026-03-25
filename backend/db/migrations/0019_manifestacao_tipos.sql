-- Adiciona tipo_manifestacao e campos opcionais para o novo fluxo de Manifestar Pendência.
-- Tipos: reivindicar_participacao, excluir_participacao, retificar_valores, esclarecer_pagamento, outros.
-- Controle deixa de ser obrigatório; livro/folhas pode ser informado como alternativa.

ALTER TABLE pendencias
  ADD COLUMN IF NOT EXISTS tipo_manifestacao TEXT;

ALTER TABLE pendencias
  ADD COLUMN IF NOT EXISTS livro_ref TEXT;

ALTER TABLE pendencias
  ADD COLUMN IF NOT EXISTS pagina_ref TEXT;
