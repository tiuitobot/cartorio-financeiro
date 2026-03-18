# Checklist de Limpeza do Frontend - Timestamps do Servidor

Data de referencia: 18/03/2026.
**Status: CONCLUÍDO — 18/03/2026**

## Objetivo

Remover do frontend os campos que agora sao carimbados pelo backend, sem quebrar a UI durante o split.

Backend ja ajustado:

- `verificado_em` e resolvido no servidor em [backend/routes/atos.js](/home/linuxadmin/repos/cartorio-financeiro/backend/routes/atos.js#L24)
- `correcoes.data` e resolvida/preservada no servidor em [backend/routes/atos.js](/home/linuxadmin/repos/cartorio-financeiro/backend/routes/atos.js#L272)
- `reivindicacoes.data` e resolvida no servidor em [backend/routes/reivindicacoes.js](/home/linuxadmin/repos/cartorio-financeiro/backend/routes/reivindicacoes.js#L17)

## Escopo

Remover do payload enviado pelo frontend:

- `verificado_em` em `POST/PUT /api/atos`
- `data` de novas correcoes em `PUT /api/atos/:id`
- `data` em `POST /api/reivindicacoes`

Campos que continuam vindo do cliente:

- `data_ato`
- `data_pagamento`
- `pagamentos_reembolso.data`

## Checklist

### 1. `ModalAto.jsx`

Arquivo alvo:

- [ModalAto.jsx](/home/linuxadmin/repos/cartorio-financeiro/frontend/src/components/modals/ModalAto.jsx)

Fazer:

- no `confirmarRecebimento`, parar de preencher `verificado_em` no cliente
- continuar preenchendo apenas `verificado_por`
- no fluxo de desfazer, continuar limpando `verificado_por`; `verificado_em` pode ser limpo so no estado local, mas nao deve mais ser considerado fonte da verdade
- ao criar nova correcao, parar de preencher `data`

Observacao importante:

- correcoes ja vindas da API devem manter o `id` recebido do backend no `PUT /api/atos/:id`
- o backend usa esse `id` para preservar a data historica da correcao durante o update
- para correcoes novas, um identificador temporario local ainda e aceitavel apenas para renderizacao da lista no modal

Sugestao de comportamento visual para correcoes novas ainda nao salvas:

- exibir `Data definida ao salvar` no lugar da data local

### 2. `ModalDeclaroParticipacao.jsx`

Arquivo alvo:

- [ModalDeclaroParticipacao.jsx](/home/linuxadmin/repos/cartorio-financeiro/frontend/src/components/modals/ModalDeclaroParticipacao.jsx)

Fazer:

- parar de enviar `data` no `POST /api/reivindicacoes`
- continuar enviando apenas os campos de dominio:
  - `ato_id`
  - `funcao`

Observacao:

- `escrevente_id`, `escrevente_nome`, `status` e `data` sao definidos no backend ou derivados do usuario autenticado
- o frontend deve ler esses campos da resposta da API depois do POST

### 3. Estado local e fallback visual

Arquivos possivelmente afetados:

- [ModalAto.jsx](/home/linuxadmin/repos/cartorio-financeiro/frontend/src/components/modals/ModalAto.jsx)
- [Atos.jsx](/home/linuxadmin/repos/cartorio-financeiro/frontend/src/pages/Atos.jsx)

Fazer:

- manter leitura de `verificado_em`, `correcoes[].data` e `reivindicacoes[].data` normalmente na renderizacao
- parar de tratá-los como campos editaveis do formulario
- considerar texto de fallback quando o item ainda nao foi salvo e o backend ainda nao devolveu o carimbo

Fallbacks sugeridos:

- `verificado_em`: `sera definido ao salvar`
- `correcao.data`: `definida ao salvar`

### 4. API layer

Arquivo de referencia:

- [api.js](/home/linuxadmin/repos/cartorio-financeiro/frontend/src/api.js)

Fazer:

- nenhuma mudanca obrigatoria na camada `api.js`
- a limpeza esta nos objetos montados antes de chamar `api.salvarAto` e `api.criarReivindicacao`

## Nao mexer nesta rodada

- `data_ato` do ato
- `data_pagamento` do ato
- `data` de pagamento de reembolso
- leitura dos campos `verificado_em`, `correcoes[].data` e `reivindicacoes[].data` retornados pela API

## Criterio de pronto

- [x] frontend nao envia mais `verificado_em` em `POST/PUT /api/atos`
- [x] frontend nao envia mais `data` em novas correcoes
- [x] frontend nao envia mais `data` em `POST /api/reivindicacoes`
- [x] UI exibe fallback "Definida ao salvar" / "data definida ao salvar" para campos ainda nao persistidos
- [ ] UI continua exibindo timestamps retornados pelo backend apos salvar/recarregar — validar end-to-end quando SEC-1/SEC-2 resolvidos e API disponivel
