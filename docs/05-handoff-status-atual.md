# Handoff - Status Atual

Data de referencia: 23/03/2026.

## Resumo do que foi feito

### 1. Analise do zip original

Foi analisado o pacote original do fornecedor e identificado que:

- o sistema e um backoffice financeiro para cartorio
- a base tem backend Express, frontend React e banco PostgreSQL
- o zip estava mal empacotado, mas o codigo util estava presente

### 2. Documentacao de hospedagem

Foram criados:

- [01-visao-executiva-hospedagem.md](/home/linuxadmin/repos/cartorio-financeiro/docs/01-visao-executiva-hospedagem.md)
- [02-mvp-railway-runbook.md](/home/linuxadmin/repos/cartorio-financeiro/docs/02-mvp-railway-runbook.md)
- [03-migracao-google-cloud.md](/home/linuxadmin/repos/cartorio-financeiro/docs/03-migracao-google-cloud.md)
- [16-avaliacao-especificacao-v2.md](/home/linuxadmin/repos/cartorio-financeiro/docs/16-avaliacao-especificacao-v2.md)
- [17-backlog-especificacao-v2.md](/home/linuxadmin/repos/cartorio-financeiro/docs/17-backlog-especificacao-v2.md)

Decisao registrada:

- subir MVP no Railway
- migrar para Google Cloud depois
- tratar a especificacao v2 do Henrique em fases, separando quick wins de mudancas estruturais de dominio

### 3. Reestruturacao do projeto

Foi criada uma base limpa em:

- `backend/`
- `frontend/`
- `docs/`
- `infra/`

Arquivos originais foram mantidos apenas como referencia:

- `README.upstream.md`
- `instalar.sh`
- `ecosystem.config.js`

### 4. Ajustes tecnicos realizados

Foram feitos os seguintes ajustes:

- suporte a `DATABASE_URL`
- suporte a `DB_SSL`
- CORS configuravel por env var
- `HOST=0.0.0.0`
- frontend aceitando `VITE_API_BASE_URL`
- `vite.config.js` aceitando proxy configuravel
- `Dockerfile` multi-stage
- `docker-compose.yml`
- `railway.json`
- esqueleto de deploy para Cloud Run
- correção simples de permissao do perfil `chefe_financeiro` no frontend
- script de migrations versionadas
- script seguro de criacao de admin
- encapsulamento da logica financeira no backend com testes unitarios
- enriquecimento aditivo do payload de atos com `total`, `comissoes` e `reembolso_devido_escrevente`
- carimbo de `verificado_em`, `correcoes.data` e `reivindicacoes.data` pelo servidor
- validacao minima de atos no backend para campos obrigatorios, valores negativos e reembolso inconsistente
- migration incremental com constraints e unicidade parcial de `controle` e `livro + pagina`
- filtro de `GET /reembolsos` e `GET /reivindicacoes` por perfil `escrevente`
- staging de importacao da planilha do controle diario com parser de `.xlsx`, persistencia de lotes e preview por API
- importacao inicial do controle diario para `atos`, usando `ESCREVENTE` como `captador_id`
- tela frontend de `Importações` com upload, preview, listagem de lotes e importacao definitiva
- E2E reproduzivel do fluxo de importacao com Playwright
- projeto Railway separado para homologacao publica
- gerador de lote `.xlsx` controlado para homologacao
- bootstrap de sistema vazio via UI, com criacao automatica de escreventes faltantes
- cancelamento de lote em preview e exclusao de lotes passados com rollback dos atos importados
- modo dedicado de conferencia financeira em `Livros de Notas`
- badges e filtros especificos para estados de conferencia financeira
- separacao explicita entre valor lancado e valor confirmado no frontend
- saneamento do legado de pagamentos para impedir pseudo-pagamentos quando `valor_pago = 0`
- migration de normalizacao dos campos legados de pagamento
- utilitario de reparo remoto via API para corrigir metadata legada sem acesso direto ao banco
- ADR de UI reutilizavel com template unico para filtros, sheets, drilldowns e tabelas
- inicio do `P2` com historico de taxas por vigencia e detalhamento de comissoes por escrevente
- baseline historica retroativa de taxa em `1900-01-01` para corrigir comissao de atos anteriores a mudancas de vigencia
- migration de backfill de baseline de taxas para escreventes ja existentes
- validacao de `P2` na homologacao com browser e API, incluindo cenarios reais de comissao historica
- promocao do `P2` para producao com checkpoint versionado
- modulo `Pendencias` implementado com:
  - geracao automatica
  - manifestacao manual do escrevente
  - filtros por tipo, escrevente, controle e periodo
  - solve / reopen / hide
  - integracao com conferencia financeira e reembolsos
- correcao do filtro por escrevente em `Relatorios > Pendencias`
- regra final de reabertura:
  - pendencia manual pode reabrir
  - pendencia automatica deve ser reaberta na origem do problema
- atalho `Abrir conferencia` nas pendencias automaticas de confirmacao financeira
- validacao do modulo de pendencias em browser e API antes da promocao para producao
- aplicacao dos fixes do Henrique (fixes 01-12 consolidados):
  - taxa 0% com migration, calculo de comissao e UI
  - tipo_ato com constraint, normalizacao de dados legados e dropdown no modal
  - visibilidade por compartilhamento restrita a captador-only (frontend e backend)
  - declaracao de participacao por funcao especifica
  - paginacao client-side em Atos e Relatorios (5 tabs)
  - Sheet com largura configuravel e formatacao de comissoes
- registro de incidentes de deploy em [docs/22-deploy-incidents-2026-03-23.md](/home/linuxadmin/repos/cartorio-financeiro/docs/22-deploy-incidents-2026-03-23.md)

## O que esta pronto

### Pronto no repositorio

- base organizada
- docs iniciais
- empacotamento para container
- esqueleto de deploy inicial e futuro
- framework simples de migrations SQL
- bootstrap seguro de usuario admin
- seed local com dados sintéticos de desenvolvimento
- smoke E2E com Playwright para `admin` e `escrevente`
- pipeline de CI com GitHub Actions para backend, build e E2E
- start de produção preparado para Railway com migrations no boot
- testes unitarios da camada financeira
- testes unitarios da camada de auditoria/data
- testes unitarios da regra de escopo de listagem por perfil
- build do frontend validado localmente
- scripts de bootstrap local para PostgreSQL nativo
- parser da planilha `Controle_Diario_2026_padronizado.xlsx`
- endpoints de staging em `GET/POST /api/importacoes`
- endpoint de importacao definitiva em `POST /api/importacoes/:id/importar`
- endpoint de cancelamento em `POST /api/importacoes/:id/cancelar`
- endpoint de exclusao em `DELETE /api/importacoes/:id`
- tela `Importações` no frontend conectada a `GET/POST /api/importacoes`
- teste E2E cobrindo upload, preview, cancelamento, importacao e exclusao com rollback
- documentacao do ambiente Railway de homologacao
- script para gerar lote `.xlsx` de homologacao sem depender da planilha real
- importacao opcional com criacao automatica de escreventes e taxa padrao configuravel
- base da frente financeira do `P2`, ainda em evolucao, com:
  - `pagamentos_ato`
  - conferencia financeira separada por lancamento
  - coluna financeira diferenciando `Lan` e `Conf`
  - modo dedicado de conferencia no modal/listagem
- base de historico de taxas com vigencia em `escreventes`
- detalhe de comissoes por escrevente em `Relatórios > Comissões`
- `P2` fechado na homologacao, com:
  - multiplos pagamentos por ato
  - conferencia financeira separada
  - diff automatico em correcoes
  - historico de taxas com vigencia
  - comissoes detalhadas por escrevente
- `P2` promovido para producao
- modulo `Pendencias` promovido para producao com:
  - listagem operacional em `Relatorios`
  - manifestacao manual do escrevente
  - filtros e escopo por perfil
  - solve / reopen / hide
  - regra de reabertura coerente com a origem da pendencia

### Pronto em nivel de conceito

- estrategia Railway agora
- estrategia Google Cloud depois
- criterio de portabilidade da aplicacao
- separacao entre Railway de producao e Railway de homologacao

## O que ainda nao foi feito

### Nao executado

- build do container
- subida com `docker compose`
- deploy no GCP

### Nao implementado

- troca obrigatoria de senha no primeiro login
- revisao de exposicao de dados sensiveis
- endurecimento restante do modelo de auditoria
- execucao ponta a ponta com banco real neste ambiente
- definicao final de `executor_id` e `signatario_id` na importacao da planilha
- lote real de homologacao com nomes reais do cartorio
- persistencia de preferencias de colunas no banco
- modulo de `auxiliar_registro` e `despesas_registro`

## Pendencias prioritarias

### Produto / seguranca

1. remover qualquer fluxo que dependa de senha fixa
2. exigir troca de senha inicial
3. revisar auth para uso remoto real
4. endurecer armazenamento de sessao/token para fase pos-MVP

### Banco

1. converter datas textuais de auditoria para tipos adequados
2. melhorar trilha de auditoria sem apagar/recriar correcoes
3. revisar a estrategia de unicidade parcial e limpar placeholders antigos
4. validar migrations em banco real e automatizar o apply no deploy
5. homologar a inferencia provisoria de pagamento da planilha
6. criar utilitario administrativo seguro para limpeza de artefatos de QA em homologacao
7. modelar `despesas_registro` sem poluir `atos`

### Aplicacao

1. mover o restante das regras criticas para o backend
2. remover workarounds redundantes do frontend agora que `C2/C3/C4/C6` ja estao no backend
3. quebrar `frontend/src/App.jsx` em modulos
4. adicionar logs mais estruturados
5. fechar a regra de `executor_id` e `signatario_id` na planilha

### Infra

1. validar o runbook nativo com PostgreSQL local e smoke real
2. validar `docker compose up --build` em ambiente com Docker disponivel
3. validar aplicacao das migrations automaticamente
4. subir primeiro ambiente no Railway
5. criar rotina real de backup do banco

## Riscos atuais

### Risco alto

- o sistema ainda nao foi exercitado ponta a ponta depois da reorganizacao
- o modelo de seguranca ainda nao esta adequado para uso remoto serio
- regras de negocio importantes seguem no frontend
- a auditoria ainda usa campos textuais no banco, embora o servidor agora seja o dono do carimbo

### Risco medio

- o deploy real ainda pode exigir ajuste fino de build
- a migration de unicidade pode falhar em bases legadas com duplicidade valida
- os documentos de infra ainda sao guias, nao automacao completa
- a importacao da planilha ja grava `captador_id`, mas ainda depende de homologacao para regras finais de pagamento, executor e signatario
- o modulo de pendencias foi promovido para producao, mas ainda pode sofrer ajuste fino de nomenclatura e UX apos uso real do cartorio

### Armadilhas operacionais conhecidas (deploy Railway)

> Detalhes completos em [docs/22-deploy-incidents-2026-03-23.md](/home/linuxadmin/repos/cartorio-financeiro/docs/22-deploy-incidents-2026-03-23.md)

- **NUNCA executar `railway up` de dentro de `frontend/`** — o Railway auto-detecta como site estatico Caddy e mata o backend Express. Sempre do root do projeto.
- **Healthcheck timeout** — o container demora ~5-7min para iniciar (migrations). O `healthcheckTimeout` esta em 600s no `railway.json`. Se o healthcheck falhar mas o `curl /api/health` funcionar, remover temporariamente o `healthcheckPath`, redeployar, e restaurar depois.
- **Migrations com CHECK constraints** — verificar dados existentes com `SELECT DISTINCT` antes de adicionar constraints. Dados legados com digitacao livre causam falha em loop.
- **Acesso ao banco de fora do Railway** — `railway run` nao funciona para scripts de banco (`postgres.railway.internal` nao resolve localmente). Usar `DATABASE_PUBLIC_URL` do servico Postgres via `railway variables --json`.
- **Link do Railway local** — apos qualquer operacao no homolog, relinkar para producao: `railway link -p secure-recreation -s amiable-perfection -e production`. Esquecer de relinkar pode causar deploy acidental em producao.

## Arquivos-chave para continuidade

### Documentacao

- [docs/README.md](/home/linuxadmin/repos/cartorio-financeiro/docs/README.md)
- [docs/04-onboarding-tecnico.md](/home/linuxadmin/repos/cartorio-financeiro/docs/04-onboarding-tecnico.md)

### Infra

- [Dockerfile](/home/linuxadmin/repos/cartorio-financeiro/Dockerfile)
- [docker-compose.yml](/home/linuxadmin/repos/cartorio-financeiro/docker-compose.yml)
- [scripts/bootstrap-local-env.sh](/home/linuxadmin/repos/cartorio-financeiro/scripts/bootstrap-local-env.sh)
- [scripts/check-local-prereqs.sh](/home/linuxadmin/repos/cartorio-financeiro/scripts/check-local-prereqs.sh)
- [scripts/bootstrap-local-db.sh](/home/linuxadmin/repos/cartorio-financeiro/scripts/bootstrap-local-db.sh)
- [scripts/dev-api.sh](/home/linuxadmin/repos/cartorio-financeiro/scripts/dev-api.sh)
- [scripts/dev-web.sh](/home/linuxadmin/repos/cartorio-financeiro/scripts/dev-web.sh)
- [scripts/local-smoke.sh](/home/linuxadmin/repos/cartorio-financeiro/scripts/local-smoke.sh)
- [railway.json](/home/linuxadmin/repos/cartorio-financeiro/railway.json)
- [infra/railway/README.md](/home/linuxadmin/repos/cartorio-financeiro/infra/railway/README.md)
- [infra/gcp/cloudrun-deploy.example.sh](/home/linuxadmin/repos/cartorio-financeiro/infra/gcp/cloudrun-deploy.example.sh)

### Codigo

- [backend/server.js](/home/linuxadmin/repos/cartorio-financeiro/backend/server.js)
- [backend/db.js](/home/linuxadmin/repos/cartorio-financeiro/backend/db.js)
- [backend/db/schema.sql](/home/linuxadmin/repos/cartorio-financeiro/backend/db/schema.sql)
- [backend/db/migrations/0001_initial.sql](/home/linuxadmin/repos/cartorio-financeiro/backend/db/migrations/0001_initial.sql)
- [backend/db/migrations/0002_atos_constraints_and_server_stamps.sql](/home/linuxadmin/repos/cartorio-financeiro/backend/db/migrations/0002_atos_constraints_and_server_stamps.sql)
- [backend/db/migrations/0003_import_lotes_preview.sql](/home/linuxadmin/repos/cartorio-financeiro/backend/db/migrations/0003_import_lotes_preview.sql)
- [backend/db/migrations/0004_atos_importacao_planilha.sql](/home/linuxadmin/repos/cartorio-financeiro/backend/db/migrations/0004_atos_importacao_planilha.sql)
- [backend/db/migrations/0010_normalize_legacy_payment_fields.sql](/home/linuxadmin/repos/cartorio-financeiro/backend/db/migrations/0010_normalize_legacy_payment_fields.sql)
- [backend/db/migrations/0011_escreventes_taxas_historico.sql](/home/linuxadmin/repos/cartorio-financeiro/backend/db/migrations/0011_escreventes_taxas_historico.sql)
- [backend/db/migrations/0012_taxas_historico_backfill_baseline.sql](/home/linuxadmin/repos/cartorio-financeiro/backend/db/migrations/0012_taxas_historico_backfill_baseline.sql)
- [backend/scripts/run-migrations.js](/home/linuxadmin/repos/cartorio-financeiro/backend/scripts/run-migrations.js)
- [backend/scripts/create-admin.js](/home/linuxadmin/repos/cartorio-financeiro/backend/scripts/create-admin.js)
- [scripts/repair-legacy-payment-metadata-via-api.mjs](/home/linuxadmin/repos/cartorio-financeiro/scripts/repair-legacy-payment-metadata-via-api.mjs)
- [backend/lib/finance.js](/home/linuxadmin/repos/cartorio-financeiro/backend/lib/finance.js)
- [backend/lib/pagamentos.js](/home/linuxadmin/repos/cartorio-financeiro/backend/lib/pagamentos.js)
- [backend/lib/audit.js](/home/linuxadmin/repos/cartorio-financeiro/backend/lib/audit.js)
- [backend/lib/list-scopes.js](/home/linuxadmin/repos/cartorio-financeiro/backend/lib/list-scopes.js)
- [backend/lib/controle-diario-import.js](/home/linuxadmin/repos/cartorio-financeiro/backend/lib/controle-diario-import.js)
- [backend/lib/taxas-historico.js](/home/linuxadmin/repos/cartorio-financeiro/backend/lib/taxas-historico.js)
- [backend/routes/atos.js](/home/linuxadmin/repos/cartorio-financeiro/backend/routes/atos.js)
- [backend/routes/importacoes.js](/home/linuxadmin/repos/cartorio-financeiro/backend/routes/importacoes.js)
- [backend/routes/reembolsos.js](/home/linuxadmin/repos/cartorio-financeiro/backend/routes/reembolsos.js)
- [backend/routes/reivindicacoes.js](/home/linuxadmin/repos/cartorio-financeiro/backend/routes/reivindicacoes.js)
- [backend/tests/audit.test.js](/home/linuxadmin/repos/cartorio-financeiro/backend/tests/audit.test.js)
- [backend/tests/controle-diario-import.test.js](/home/linuxadmin/repos/cartorio-financeiro/backend/tests/controle-diario-import.test.js)
- [backend/tests/finance.test.js](/home/linuxadmin/repos/cartorio-financeiro/backend/tests/finance.test.js)
- [backend/tests/list-scopes.test.js](/home/linuxadmin/repos/cartorio-financeiro/backend/tests/list-scopes.test.js)
- [frontend/src/App.jsx](/home/linuxadmin/repos/cartorio-financeiro/frontend/src/App.jsx)
- [frontend/src/api.js](/home/linuxadmin/repos/cartorio-financeiro/frontend/src/api.js)
- [frontend/src/pages/Atos.jsx](/home/linuxadmin/repos/cartorio-financeiro/frontend/src/pages/Atos.jsx)
- [frontend/src/components/modals/ModalAto.jsx](/home/linuxadmin/repos/cartorio-financeiro/frontend/src/components/modals/ModalAto.jsx)

## Proximo passo recomendado

Ordem recomendada:

1. validar o fluxo nativo em [docs/09-infra-local-postgres.md](/home/linuxadmin/repos/cartorio-financeiro/docs/09-infra-local-postgres.md)
2. confirmar em ambiente com banco real o cleanup do frontend e liberar remocao de `utils/business.js`
3. validar `docker compose up --build` em ambiente com Docker disponivel
4. fechar a rodada atual da frente financeira em producao
5. homologar com o usuario do cartorio
6. continuar o `P2` com historico de taxas
7. so depois comecar a automacao de migracao para GCP

## Criterio de aceite minimo antes de deploy real

- container buildando
- app respondendo `/api/health`
- banco iniciando com schema
- migrations `0001` e `0002` aplicando sem erro em banco limpo
- login funcional
- criacao e consulta de ato funcionais
- um admin seguro criado manualmente
- CORS e dominio configurados
- backup do banco definido

## Validacao efetivamente executada neste ambiente

- `npm install` em `backend/`
- `npm install` em `frontend/`
- `node --test tests/**/*.test.js` em `backend/`
- `npm run build` em `frontend/`

Limitacao encontrada:

- `docker` nao esta instalado neste ambiente, entao `docker compose up --build` nao foi executado aqui
- `psql` tambem nao esta instalado neste ambiente, entao o bootstrap do PostgreSQL nativo foi preparado, mas nao executado aqui
