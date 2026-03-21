# Checkpoint - Pendencias em Producao

Data de referencia: 21/03/2026.

## Contexto

Depois do fechamento do `P2`, a frente seguinte foi o modulo de pendencias.

Essa frente ficou primeiro isolada na homologacao para validar:

- geracao automatica de pendencias
- manifestacao manual do escrevente
- filtros e escopo por perfil
- solve / reopen / hide
- integracao com conferencia financeira

Durante a validacao funcional apareceram dois ajustes importantes:

1. o filtro por escrevente em `Relatorios > Pendencias` precisava considerar os envolvidos do ato e nao so `pendencia.escrevente_id`
2. `Reabrir` estava semanticamente errado para pendencias automaticas, porque reabria o ticket sem desfazer a origem do problema

## Escopo promovido

O estado promovido para producao consolida:

- modulo `Pendencias` operacional em `Relatorios`
- pendencias automaticas por:
  - ato sem pagamento lancado
  - confirmacao financeira pendente
  - informacao incompleta
- manifestacao manual do escrevente com acesso restrito quando o ato nao pertence ao seu escopo
- acoes administrativas:
  - `Solucionar`
  - `Reabrir` apenas para pendencias manuais
  - `Ocultar`
- atalho `Abrir conferencia` para pendencias automaticas de confirmacao financeira

## Regras finais desta rodada

### Reabertura de pendencias

Pendencia manual:

- pode ser reaberta
- o objetivo e reabrir o fluxo humano de tratamento

Pendencia automatica:

- nao pode ser reaberta diretamente pela propria linha
- deve ser reaberta na origem do problema
- exemplo:
  - para `confirmacao_pendente`, o caminho correto e abrir o ato e desfazer a conferencia financeira

Essa regra ficou protegida em dois niveis:

- UI: o botao `Reabrir` nao aparece para pendencias automaticas
- backend: `PUT /api/pendencias/:id` retorna `409` quando tentam reabrir uma pendencia automatica

### Conferencia financeira a partir da pendencia

Para pendencias do tipo `confirmacao_pendente`, a listagem agora mostra:

- `Abrir conferencia`

Esse atalho abre diretamente o ato no modo:

- `Modo de conferencia financeira`

## Validacao executada

### Local

- `cd backend && npm test`
- `cd frontend && npm run build`

Resultado:

- backend tests: `34 pass`
- frontend build: `ok`

### Homologacao

Foi validado com browser e API:

1. pendencia automatica solucionada
   - `Controle 36122`
   - `Reabrir = 0`
   - `Abrir conferencia = 1`
   - ao clicar, o modal abriu em:
     - `Modo de conferencia financeira`
     - `Lançamentos e Conferência Financeira`

2. pendencia manual
   - manifestacao criada por escrevente temporario
   - admin solucionou pela UI
   - em `Solucionadas`, a linha mostrou:
     - `Reabrir = 1`

3. protecao de backend
   - tentativa de reabrir pendencia automatica via API
   - resposta:
     - `409`
     - `Pendencias automaticas devem ser reabertas na origem do problema`

## Limpeza de QA

Todos os artefatos temporarios usados na validacao foram removidos da homologacao:

- pendencias temporarias
- correcoes temporarias
- usuarios temporarios

Contagem final apos limpeza:

- `pendencias = 0`
- `correcoes = 0`
- `usuarios temporarios = 0`

## Estado do checkpoint

Este checkpoint consolida:

- modulo de pendencias promovido para producao
- regra correta de reabertura
- atalho explicito para conferencia financeira
- filtro de escrevente corrigido
- homologacao limpa apos testes de QA
