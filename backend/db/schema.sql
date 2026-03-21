-- ============================================================
-- Cartório de Notas — Schema PostgreSQL
-- ============================================================

CREATE TABLE IF NOT EXISTS escreventes (
  id           SERIAL PRIMARY KEY,
  nome         VARCHAR(255) NOT NULL,
  cargo        VARCHAR(255),
  email        VARCHAR(255) UNIQUE,
  taxa         INTEGER NOT NULL CHECK (taxa IN (6, 20, 30)),
  ativo        BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS escreventes_compartilhamento (
  escrevente_id      INTEGER REFERENCES escreventes(id) ON DELETE CASCADE,
  compartilha_com_id INTEGER REFERENCES escreventes(id) ON DELETE CASCADE,
  PRIMARY KEY (escrevente_id, compartilha_com_id)
);

CREATE TABLE IF NOT EXISTS atos (
  id                      SERIAL PRIMARY KEY,
  controle                VARCHAR(20) NOT NULL,
  livro                   VARCHAR(10) NOT NULL,
  pagina                  VARCHAR(5) NOT NULL,
  data_ato                DATE,
  tipo_ato                VARCHAR(255),
  nome_tomador            VARCHAR(255),
  captador_id             INTEGER REFERENCES escreventes(id),
  executor_id             INTEGER REFERENCES escreventes(id),
  signatario_id           INTEGER REFERENCES escreventes(id),
  emolumentos             DECIMAL(12,2) DEFAULT 0,
  repasses                DECIMAL(12,2) DEFAULT 0,
  issqn                   DECIMAL(12,2) DEFAULT 0,
  reembolso_tabeliao      DECIMAL(12,2) DEFAULT 0,
  reembolso_escrevente    DECIMAL(12,2) DEFAULT 0,
  escrevente_reembolso_id INTEGER REFERENCES escreventes(id),
  valor_pago              DECIMAL(12,2) DEFAULT 0,
  data_pagamento          DATE,
  forma_pagamento         VARCHAR(50),
  controle_cheques        VARCHAR(255),
  status                  VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente','pago','pago_menor','pago_maior')),
  verificado_por          VARCHAR(255),
  verificado_em           VARCHAR(50),
  comissao_override       JSONB,
  notas                   TEXT,
  CONSTRAINT chk_atos_controle_formato CHECK (controle ~ '^[0-9]{1,20}$'),
  CONSTRAINT chk_atos_livro_digitos CHECK (livro ~ '^[0-9]+$'),
  CONSTRAINT chk_atos_pagina_digitos CHECK (pagina ~ '^[0-9]+$'),
  CONSTRAINT chk_atos_valores_nao_negativos CHECK (
    emolumentos >= 0
    AND repasses >= 0
    AND issqn >= 0
    AND reembolso_tabeliao >= 0
    AND reembolso_escrevente >= 0
    AND valor_pago >= 0
  ),
  CONSTRAINT chk_atos_reembolso_escrevente_vinculo CHECK (
    (reembolso_escrevente <= 0 AND escrevente_reembolso_id IS NULL)
    OR (reembolso_escrevente > 0 AND escrevente_reembolso_id IS NOT NULL)
  ),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS correcoes (
  id         SERIAL PRIMARY KEY,
  ato_id     INTEGER REFERENCES atos(id) ON DELETE CASCADE,
  autor      VARCHAR(255) NOT NULL,
  autor_id   INTEGER,
  mensagem   TEXT NOT NULL,
  data       VARCHAR(50),
  status     VARCHAR(20) DEFAULT 'aguardando' CHECK (status IN ('aguardando','aprovado','contestado')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS pagamentos_reembolso (
  id                   SERIAL PRIMARY KEY,
  escrevente_id        INTEGER REFERENCES escreventes(id),
  data                 DATE NOT NULL,
  valor                DECIMAL(12,2) NOT NULL,
  notas                TEXT,
  confirmado_escrevente BOOLEAN DEFAULT false,
  confirmado_em        TIMESTAMPTZ,
  contestado_escrevente BOOLEAN DEFAULT false,
  contestacao_justificativa TEXT,
  contestado_em        TIMESTAMPTZ,
  CONSTRAINT chk_pagamentos_reembolso_valor_positivo CHECK (valor > 0),
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reivindicacoes (
  id                SERIAL PRIMARY KEY,
  ato_id            INTEGER REFERENCES atos(id) ON DELETE CASCADE,
  escrevente_id     INTEGER REFERENCES escreventes(id),
  escrevente_nome   VARCHAR(255),
  funcao            VARCHAR(20) NOT NULL CHECK (funcao IN ('executor','signatario')),
  data              VARCHAR(50),
  status            VARCHAR(30) DEFAULT 'pendente',
  justificativa     TEXT,
  decisao_financeiro TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usuarios (
  id            SERIAL PRIMARY KEY,
  nome          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  senha_hash    VARCHAR(255) NOT NULL,
  perfil        VARCHAR(30) NOT NULL CHECK (perfil IN ('admin','chefe_financeiro','financeiro','escrevente')),
  escrevente_id INTEGER REFERENCES escreventes(id),
  ativo         BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS import_lotes (
  id                  SERIAL PRIMARY KEY,
  tipo                VARCHAR(50) NOT NULL DEFAULT 'controle_diario_xlsx',
  arquivo_nome        VARCHAR(255) NOT NULL,
  arquivo_sha256      VARCHAR(64) NOT NULL,
  sheet_name          VARCHAR(255) NOT NULL,
  headers             JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_linhas        INTEGER NOT NULL DEFAULT 0,
  linhas_validas      INTEGER NOT NULL DEFAULT 0,
  linhas_com_erro     INTEGER NOT NULL DEFAULT 0,
  linhas_com_alerta   INTEGER NOT NULL DEFAULT 0,
  summary             JSONB NOT NULL DEFAULT '{}'::jsonb,
  status              VARCHAR(20) NOT NULL DEFAULT 'preview'
                        CHECK (status IN ('preview','importado','importado_parcial','cancelado','falha')),
  uploaded_by_user_id INTEGER REFERENCES usuarios(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS import_linhas (
  id              SERIAL PRIMARY KEY,
  lote_id         INTEGER NOT NULL REFERENCES import_lotes(id) ON DELETE CASCADE,
  numero_linha    INTEGER NOT NULL,
  raw_data        JSONB NOT NULL DEFAULT '{}'::jsonb,
  normalized_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  errors          JSONB NOT NULL DEFAULT '[]'::jsonb,
  warnings        JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_atos_controle       ON atos(controle);
CREATE INDEX IF NOT EXISTS idx_atos_livro_pagina   ON atos(livro, pagina);
CREATE INDEX IF NOT EXISTS idx_atos_data_ato       ON atos(data_ato);
CREATE INDEX IF NOT EXISTS idx_atos_status         ON atos(status);
CREATE INDEX IF NOT EXISTS idx_atos_captador       ON atos(captador_id);
CREATE INDEX IF NOT EXISTS idx_atos_data_pgto      ON atos(data_pagamento);
CREATE UNIQUE INDEX IF NOT EXISTS ux_atos_controle_valido
  ON atos(controle)
  WHERE controle <> '00000';
CREATE UNIQUE INDEX IF NOT EXISTS ux_atos_livro_pagina_validos
  ON atos(livro, pagina)
  WHERE livro <> '0' AND pagina <> '0';
CREATE INDEX IF NOT EXISTS idx_correcoes_ato       ON correcoes(ato_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_ato_ato  ON pagamentos_ato(ato_id, data_pagamento, id);
CREATE INDEX IF NOT EXISTS idx_reiv_ato            ON reivindicacoes(ato_id);
CREATE INDEX IF NOT EXISTS idx_reiv_escrevente     ON reivindicacoes(escrevente_id);
CREATE INDEX IF NOT EXISTS idx_import_lotes_created_at ON import_lotes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_lotes_uploaded_by ON import_lotes(uploaded_by_user_id);
CREATE INDEX IF NOT EXISTS idx_import_linhas_lote  ON import_linhas(lote_id, numero_linha);

-- Trigger: atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_atos_updated_at') THEN
    CREATE TRIGGER trg_atos_updated_at BEFORE UPDATE ON atos FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_escreventes_updated_at') THEN
    CREATE TRIGGER trg_escreventes_updated_at BEFORE UPDATE ON escreventes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_import_lotes_updated_at') THEN
    CREATE TRIGGER trg_import_lotes_updated_at BEFORE UPDATE ON import_lotes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_pagamentos_ato_updated_at') THEN
    CREATE TRIGGER trg_pagamentos_ato_updated_at BEFORE UPDATE ON pagamentos_ato FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
