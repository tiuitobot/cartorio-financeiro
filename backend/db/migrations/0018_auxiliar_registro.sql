ALTER TABLE usuarios
  DROP CONSTRAINT IF EXISTS usuarios_perfil_check;

ALTER TABLE usuarios
  ADD CONSTRAINT usuarios_perfil_check
  CHECK (perfil IN ('admin', 'chefe_financeiro', 'financeiro', 'escrevente', 'auxiliar_registro'));
