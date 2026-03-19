# Cartorio Financeiro

Base limpa do projeto extraida do zip original e preparada para deploy cloud-portable.

## Estrutura

- `backend/`: API Express e schema PostgreSQL
- `frontend/`: interface React/Vite
- `docs/`: analise de hospedagem, MVP no Railway e migracao para Google Cloud
- `infra/railway/`: notas operacionais para deploy inicial
- `infra/gcp/`: esqueleto de migracao para Cloud Run + Cloud SQL
- `backend/lib/controle-diario-import.js`: parser e normalizacao da planilha do controle diario

## Objetivo desta organizacao

- subir o MVP agora no Railway
- manter o codigo portavel
- migrar depois para Google Cloud sem reescrever a aplicacao

## Arquivos principais de deploy

- `Dockerfile`
- `docker-compose.yml`
- `.env.example`
- `railway.json`

## Fluxo local recomendado

O fluxo local recomendado agora e com PostgreSQL nativo antes de qualquer deploy cloud:

1. `./scripts/bootstrap-local-env.sh`
2. `./scripts/check-local-prereqs.sh`
3. `./scripts/bootstrap-local-db.sh`
4. `cd backend && npm run migrate`
5. `./scripts/dev-api.sh`
6. `./scripts/dev-web.sh`

Runbook completo:

- [docs/09-infra-local-postgres.md](/home/linuxadmin/repos/cartorio-financeiro/docs/09-infra-local-postgres.md)

## Scripts operacionais do backend

Executados a partir de `backend/`:

- `npm run migrate`
- `npm run admin:create`
- `npm run seed:dev`
- `npm test`

## Importacao da planilha do cartorio

Ja existe trilha de staging para upload e preview da planilha `Controle_Diario_2026_padronizado.xlsx`.

- documentacao: [docs/13-importacao-controle-diario.md](/home/linuxadmin/repos/cartorio-financeiro/docs/13-importacao-controle-diario.md)
- parser: [backend/lib/controle-diario-import.js](/home/linuxadmin/repos/cartorio-financeiro/backend/lib/controle-diario-import.js)
- rota: [backend/routes/importacoes.js](/home/linuxadmin/repos/cartorio-financeiro/backend/routes/importacoes.js)

Nesta fase o sistema ainda nao grava a planilha direto em `atos`. Primeiro ele faz parse, validacao e persistencia em staging.

## Scripts de infra local

Executados a partir da raiz:

- `./scripts/bootstrap-local-env.sh`
- `./scripts/check-local-prereqs.sh`
- `./scripts/bootstrap-local-db.sh`
- `./scripts/dev-api.sh`
- `./scripts/dev-web.sh`
- `./scripts/local-smoke.sh`

## Observacoes

- O arquivo original do fornecedor foi preservado em `cartorio server.zip`
- O README original do pacote foi preservado em `README.upstream.md`
- O script `instalar.sh` foi mantido apenas como referencia historica de deploy em VM
