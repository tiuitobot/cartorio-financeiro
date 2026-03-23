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

-- 3. Normalizar tipo_ato existente para valores canônicos (minúsculas, sem acento)
--    Dados legados vêm com digitação livre (ESCRTURA, DELARATÓRIA, ATA NOTARIAL, etc.)
UPDATE atos SET tipo_ato = 'escritura'  WHERE lower(tipo_ato) LIKE '%escritura%' OR lower(tipo_ato) LIKE '%escrtura%';
UPDATE atos SET tipo_ato = 'ata'        WHERE lower(tipo_ato) LIKE '%ata%notarial%' OR lower(tipo_ato) LIKE '%ata%de%usucapi%';
UPDATE atos SET tipo_ato = 'testamento' WHERE lower(tipo_ato) LIKE '%testamento%';
UPDATE atos SET tipo_ato = 'procuracao' WHERE lower(tipo_ato) LIKE '%procura%';
UPDATE atos SET tipo_ato = 'certidao'   WHERE lower(tipo_ato) LIKE '%certid%' OR lower(tipo_ato) LIKE '%certd%';
-- Tudo que não encaixa nos tipos canônicos fica NULL (sem constraint violation)
UPDATE atos SET tipo_ato = NULL WHERE tipo_ato IS NOT NULL
  AND tipo_ato NOT IN ('escritura', 'ata', 'testamento', 'procuracao', 'certidao', 'apostila');

-- 4. Adicionar constraint de valores válidos para tipo_ato
ALTER TABLE atos
  DROP CONSTRAINT IF EXISTS chk_atos_tipo_ato;
ALTER TABLE atos
  ADD CONSTRAINT chk_atos_tipo_ato
  CHECK (
    tipo_ato IS NULL
    OR tipo_ato IN ('escritura', 'ata', 'testamento', 'procuracao', 'certidao', 'apostila')
  );
