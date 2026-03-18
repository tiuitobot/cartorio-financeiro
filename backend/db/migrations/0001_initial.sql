-- Baseline inicial do schema.
-- Este arquivo espelha a estrutura atual de backend/db/schema.sql
-- para permitir versionamento incremental a partir deste ponto.

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
  controle                CHAR(5) NOT NULL,
  livro                   VARCHAR(10) NOT NULL,
  pagina                  VARCHAR(5) NOT NULL,
  data_ato                DATE,
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
  status                  VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente','pago','pago_menor','pago_maior')),
  verificado_por          VARCHAR(255),
  verificado_em           VARCHAR(50),
  comissao_override       JSONB,
  notas                   TEXT,
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

CREATE TABLE IF NOT EXISTS pagamentos_reembolso (
  id                    SERIAL PRIMARY KEY,
  escrevente_id         INTEGER REFERENCES escreventes(id),
  data                  DATE NOT NULL,
  valor                 DECIMAL(12,2) NOT NULL,
  notas                 TEXT,
  confirmado_escrevente BOOLEAN DEFAULT false,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reivindicacoes (
  id                 SERIAL PRIMARY KEY,
  ato_id             INTEGER REFERENCES atos(id) ON DELETE CASCADE,
  escrevente_id      INTEGER REFERENCES escreventes(id),
  escrevente_nome    VARCHAR(255),
  funcao             VARCHAR(20) NOT NULL CHECK (funcao IN ('executor','signatario')),
  data               VARCHAR(50),
  status             VARCHAR(30) DEFAULT 'pendente',
  justificativa      TEXT,
  decisao_financeiro TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW()
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

CREATE INDEX IF NOT EXISTS idx_atos_controle       ON atos(controle);
CREATE INDEX IF NOT EXISTS idx_atos_livro_pagina   ON atos(livro, pagina);
CREATE INDEX IF NOT EXISTS idx_atos_data_ato       ON atos(data_ato);
CREATE INDEX IF NOT EXISTS idx_atos_status         ON atos(status);
CREATE INDEX IF NOT EXISTS idx_atos_captador       ON atos(captador_id);
CREATE INDEX IF NOT EXISTS idx_atos_data_pgto      ON atos(data_pagamento);
CREATE INDEX IF NOT EXISTS idx_correcoes_ato       ON correcoes(ato_id);
CREATE INDEX IF NOT EXISTS idx_reiv_ato            ON reivindicacoes(ato_id);
CREATE INDEX IF NOT EXISTS idx_reiv_escrevente     ON reivindicacoes(escrevente_id);

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
END $$;
