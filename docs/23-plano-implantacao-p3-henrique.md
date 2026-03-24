# Plano de Implantação — P3 Restante do Henrique

Data de referência: 24/03/2026.

Status em 24/03/2026:

- todas as 6 etapas concluídas
- validação local completa executada
- homologação Railway validada por smoke + Chromium

## Objetivo

Fechar o restante do `P3` de forma sequencial, com validação suficiente para subir cada rodada na homologação sem contaminar produção.

Escopo restante consolidado do backlog:

- `8.4` restringir `reembolso_tabeliao`
- `3.1 fase 2` persistência de preferências de colunas no banco
- `7.1 fase 2` alertas financeiros e workflow proativo de contestação
- `8.2` tabela `despesas_registro`
- `8.1` perfil `auxiliar_registro`
- `8.3` despesa após pagamento sem alterar status do ato

## Observação importante sobre 8.4

Hoje, `escrevente` já não consegue editar `atos`, então o pedido do Henrique já está **implicitamente protegido** pelo modelo atual de autorização.

Mesmo assim, vamos fechar `8.4` como item próprio porque:

- a regra ainda não está expressa como invariável de domínio
- ela precisa continuar válida quando o perfil `auxiliar_registro` for introduzido
- sem teste de regressão, a proteção fica frágil e fácil de quebrar em refactors futuros

## Sequência de implantação

### Etapa 1 — Hardening de permissão (`8.4`)

Entregável:

- transformar a edição de `reembolso_tabeliao` em regra explícita no backend
- espelhar essa intenção no frontend
- adicionar teste unitário de regressão

Critério de aceite:

- perfis fora da trilha financeira não podem alterar `reembolso_tabeliao`
- a regra permanece verdadeira mesmo depois da entrada de novos perfis

Validação:

- backend unit tests
- frontend build

### Etapa 2 — Persistência de colunas (`3.1 fase 2`)

Entregável:

- tabela/API de preferências por usuário
- `Atos` migrando de `localStorage` para backend com fallback seguro
- `Relatórios > Atos` ganhando persistência real

Critério de aceite:

- usuário altera colunas, atualiza a página e mantém a configuração
- preferências são isoladas por usuário

Validação:

- unit tests do backend
- integração da API de preferências
- smoke local
- Chromium em homologação com reload da página

### Etapa 3 — Alertas financeiros (`7.1 fase 2`)

Entregável:

- transformar contestação de reembolso em fluxo realmente visível para o financeiro
- surfacing proativo na UI a partir da infraestrutura já existente de `pendencias`

Critério de aceite:

- escrevente contesta reembolso
- financeiro vê alerta sem depender de busca manual
- resolução do pagamento encerra o alerta

Validação:

- unit tests do backend
- integração da sincronização de pendências
- smoke funcional
- Chromium em homologação com dois perfis

### Etapa 4 — Fundação de `despesas_registro` (`8.2`)

Entregável:

- migration da nova tabela
- camada backend com CRUD básico
- contratos claros separados de `atos`

Critério de aceite:

- despesas de registro passam a existir sem criar “ato dormente”
- vínculo com controle e metadados do registro ficam no domínio correto

Validação:

- unit tests da camada de domínio
- integração do CRUD
- smoke de API

### Etapa 5 — Perfil `auxiliar_registro` (`8.1`)

Entregável:

- perfil novo no banco/auth
- regras de autorização
- UI mínima para operar `despesas_registro`

Critério de aceite:

- `auxiliar_registro` entra e opera só o subdomínio de registro
- não ganha acesso indevido a operações financeiras ou administrativas

Validação:

- unit tests de autorização/escopo
- integração de login e permissões
- Chromium em homologação com usuário dedicado

### Etapa 6 — Regra de despesa após pagamento (`8.3`)

Entregável:

- despesas posteriores ao pagamento não recalculam nem degradam o status do ato
- eventual vínculo com reembolso é registrado no domínio novo, não em `atos`

Critério de aceite:

- ato pago continua pago
- nova despesa de registro não reabre status financeiro do ato

Validação:

- unit tests da regra
- integração com dados reais da API
- Chromium em homologação reproduzindo o fluxo completo

## Regra operacional por etapa

Cada etapa só é considerada fechada quando passar por esta escada:

1. `npm test` no backend
2. `npm run build` no frontend
3. smoke/integração local da frente alterada
4. deploy na homologação
5. teste Chromium no link público de homologação
6. limpeza de artefatos temporários de QA

## Resultado

1. `8.4` concluído
2. `3.1 fase 2` concluído
3. `7.1 fase 2` concluído
4. `8.2` concluído
5. `8.1` concluído
6. `8.3` concluído
