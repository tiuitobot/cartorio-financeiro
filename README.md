# Cartorio Financeiro

Sistema de gestao financeira para cartorios — controle de atos, comissoes, reembolsos, pendencias e despesas de registro. Em producao no Railway.

## Estrutura

- `backend/`: API Express (9 modulos de rotas) e schema PostgreSQL (19 migrations)
- `frontend/`: interface React/Vite (8 paginas, componentes reutilizaveis)
- `docs/`: documentacao tecnica, runbooks, backlog e ADRs
- `infra/railway/`: notas operacionais para deploy
- `infra/gcp/`: esqueleto de migracao para Cloud Run + Cloud SQL

## Modulos principais

- **Atos**: registro, busca, calculo financeiro com comissoes e pagamentos
- **Escreventes**: cadastro de escreventes com historico de taxas
- **Importacoes**: upload e validacao de planilhas XLSX com staging
- **Pendencias**: criacao automatica e manual, manifestacao, resolucao
- **Reembolsos**: solicitacao, confirmacao e contestacao
- **Reivindicacoes**: pedidos de participacao em atos
- **Despesas de Registro**: controle de despesas por ato
- **Usuarios**: cadastro, perfis (admin/financeiro/escrevente/auxiliar_registro), preferencias
- **Auth**: login JWT, troca de senha obrigatoria no primeiro acesso

## Deploy

Producao hospedada no Railway (`railway up` da raiz do projeto). Healthcheck timeout configurado em 600s no `railway.json`.

Arquivos de deploy:
- `Dockerfile` — build multi-stage (backend + frontend)
- `docker-compose.yml` — ambiente local com PostgreSQL
- `.env.example` — variaveis de ambiente necessarias
- `railway.json` — configuracao Railway (healthcheck, build, start)

## Fluxo local recomendado

PostgreSQL nativo, sem Docker:

1. `./scripts/bootstrap-local-env.sh`
2. `./scripts/check-local-prereqs.sh`
3. `./scripts/bootstrap-local-db.sh`
4. `cd backend && npm run migrate`
5. `./scripts/dev-api.sh`
6. `./scripts/dev-web.sh`

Runbook completo:

- [docs/09-infra-local-postgres.md](/home/linuxadmin/repos/cartorio-financeiro/docs/09-infra-local-postgres.md)

## Scripts do backend

Executados a partir de `backend/`:

- `npm run migrate` — executa migrations sequenciais
- `npm run admin:create` — cria usuario admin interativamente
- `npm run seed:dev` — popula dados de desenvolvimento
- `npm run pendencias:sync` — sincroniza pendencias automaticas
- `npm test` — roda 60 testes (Node test runner nativo)

## Scripts de infra local

Executados a partir da raiz:

- `./scripts/bootstrap-local-env.sh`
- `./scripts/check-local-prereqs.sh`
- `./scripts/bootstrap-local-db.sh`
- `./scripts/dev-api.sh`
- `./scripts/dev-web.sh`
- `./scripts/local-smoke.sh`

## Testes

Backend: 60 testes unitarios cobrindo permissoes, financeiro, pagamentos, pendencias, preferencias, importacao e rotas.

Frontend: smoke E2E com Playwright (`cd frontend && npm run e2e`).

## Observacoes

- O arquivo original do fornecedor foi preservado em `cartorio server.zip`
- O README original do pacote foi preservado em `README.upstream.md`
- O script `instalar.sh` foi mantido apenas como referencia historica de deploy em VM
