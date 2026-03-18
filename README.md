# Cartorio Financeiro

Base limpa do projeto extraida do zip original e preparada para deploy cloud-portable.

## Estrutura

- `backend/`: API Express e schema PostgreSQL
- `frontend/`: interface React/Vite
- `docs/`: analise de hospedagem, MVP no Railway e migracao para Google Cloud
- `infra/railway/`: notas operacionais para deploy inicial
- `infra/gcp/`: esqueleto de migracao para Cloud Run + Cloud SQL

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
