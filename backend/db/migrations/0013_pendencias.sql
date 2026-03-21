CREATE TABLE IF NOT EXISTS pendencias (
  id                    SERIAL PRIMARY KEY,
  ato_id                INTEGER REFERENCES atos(id) ON DELETE CASCADE,
  import_lote_id        INTEGER REFERENCES import_lotes(id) ON DELETE CASCADE,
  tipo                  VARCHAR(60) NOT NULL
                          CHECK (tipo IN (
                            'pendencia_pagamento',
                            'confirmacao_pendente',
                            'manifestacao_escrevente',
                            'informacao_conflitante',
                            'informacao_incompleta'
                          )),
  descricao             TEXT,
  controle_ref          VARCHAR(20),
  data_ato_ref          DATE,
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_por_user_id    INTEGER REFERENCES usuarios(id),
  solucionado           BOOLEAN NOT NULL DEFAULT false,
  solucionado_em        TIMESTAMPTZ,
  solucionado_por_user_id INTEGER REFERENCES usuarios(id),
  resolucao             TEXT,
  escrevente_id         INTEGER REFERENCES escreventes(id),
  origem                VARCHAR(20) NOT NULL DEFAULT 'automatica'
                          CHECK (origem IN ('automatica','escrevente')),
  visivel               BOOLEAN NOT NULL DEFAULT true,
  chave_unica           VARCHAR(255),
  metadata              JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_pendencias_ato
  ON pendencias(ato_id);

CREATE INDEX IF NOT EXISTS idx_pendencias_import_lote
  ON pendencias(import_lote_id);

CREATE INDEX IF NOT EXISTS idx_pendencias_escrevente
  ON pendencias(escrevente_id);

CREATE INDEX IF NOT EXISTS idx_pendencias_tipo
  ON pendencias(tipo, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_pendencias_status_visibilidade
  ON pendencias(visivel, solucionado, criado_em, solucionado_em);

CREATE INDEX IF NOT EXISTS idx_pendencias_controle_ref
  ON pendencias(controle_ref);

CREATE UNIQUE INDEX IF NOT EXISTS ux_pendencias_chave_aberta
  ON pendencias(chave_unica)
  WHERE chave_unica IS NOT NULL
    AND solucionado = false
    AND visivel = true;
