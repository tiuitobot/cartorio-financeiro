-- ============================================================
-- Migration: taxa 0% e constraint de tipo_ato
-- ============================================================

-- 1. Adicionar taxa 0% ao check de escreventes
ALTER TABLE escreventes
  DROP CONSTRAINT IF EXISTS escreventes_taxa_check;
ALTER TABLE escreventes
  ADD CONSTRAINT escreventes_taxa_check
  CHECK (taxa IN (0, 6, 20, 30));

-- 2. Adicionar taxa 0% ao check do histórico de taxas
ALTER TABLE escreventes_taxas_historico
  DROP CONSTRAINT IF EXISTS escreventes_taxas_historico_taxa_check;
ALTER TABLE escreventes_taxas_historico
  ADD CONSTRAINT escreventes_taxas_historico_taxa_check
  CHECK (taxa IN (0, 6, 20, 30));

-- 3. Adicionar constraint de valores válidos para tipo_ato
ALTER TABLE atos
  DROP CONSTRAINT IF EXISTS chk_atos_tipo_ato;
ALTER TABLE atos
  ADD CONSTRAINT chk_atos_tipo_ato
  CHECK (
    tipo_ato IS NULL
    OR tipo_ato IN ('escritura', 'ata', 'testamento', 'procuracao', 'certidao', 'apostila')
  );
