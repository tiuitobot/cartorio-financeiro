# Checkpoint - Saneamento de Pagamento Legado

Data de referencia: 21/03/2026.

## Contexto

Durante a homologacao do fluxo de conferencia financeira, apareceram inconsistencias em atos ja existentes:

- atos sem pagamento real apareciam como `Conferir`
- alguns atos mostravam `Pgto 0` mesmo com lancamentos existentes

Exemplos validados na homologacao:

- `Controle 00286`
- `Controle 00999`

## Diagnostico

O problema principal nao estava na importacao atual da planilha.

Havia dois cenarios distintos:

1. dados legados em `atos`
   - alguns atos tinham `forma_pagamento` e/ou metadata de verificacao preenchidas
   - mas `valor_pago = 0`
   - isso fazia a API fabricar um pagamento legado sintetico no enriquecimento financeiro

2. leituras novas em `pagamentos_ato`
   - em atos com pagamentos reais ainda nao conferidos, a UI precisava distinguir melhor:
     - valor lancado
     - valor confirmado

## Correcoes aplicadas

### Regra de backend

Em [backend/lib/finance.js](/home/linuxadmin/repos/cartorio-financeiro/backend/lib/finance.js):

- o fallback legado agora so cria pagamento sintetico quando `valor_pago > 0`
- metadata legada sem valor nao gera mais pseudo-pagamento

### Migration de normalizacao

Em [0010_normalize_legacy_payment_fields.sql](/home/linuxadmin/repos/cartorio-financeiro/backend/db/migrations/0010_normalize_legacy_payment_fields.sql):

- pagamentos antigos validos sao copiados para `pagamentos_ato` quando necessario
- campos legados orfaos em `atos` sao limpos quando:
  - `valor_pago <= 0`
  - nao existe linha real em `pagamentos_ato`

### Utilitario de reparo remoto

Em [repair-legacy-payment-metadata-via-api.mjs](/home/linuxadmin/repos/cartorio-financeiro/scripts/repair-legacy-payment-metadata-via-api.mjs):

- foi criado um reparo idempotente via API
- o script regrava atos que ainda exibam pagamentos sinteticos legados
- isso permite corrigir ambiente remoto sem acesso direto ao PostgreSQL

## Validacao

### Local

- `cd backend && npm test`
- `cd frontend && npm run build`
- `cd frontend && CI=1 npm run e2e`

Resultado:

- backend tests: `5 passed`
- frontend build: `ok`
- e2e: `5 passed`

### Homologacao

Depois da correcao, foi revalidado:

- `00286`
  - `pagamentos = []`
  - `valor_pago_lancado = 0`
  - `pagamentos_lancados = 0`

- `00999`
  - `pagamentos_lancados = 2`
  - `valor_pago_lancado = 800`
  - `valor_pago = 0`
  - `pagamentos_confirmados = 0`

Conclusao:

- `00286` era defeito de legado financeiro
- `00999` estava correto no banco; a leitura precisava separar lancado de confirmado

## Estado do checkpoint

Este checkpoint consolida:

- modo dedicado de conferencia financeira
- badges claros em `Livros de Notas`
- coluna financeira com `Lan` x `Conf`
- saneamento de metadata legada
- base pronta para promover a frente financeira da homologacao para producao
