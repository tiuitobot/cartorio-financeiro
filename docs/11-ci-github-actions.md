# CI com GitHub Actions

Data de referencia: 18/03/2026.

## Objetivo

Executar validacao automatica a cada `push` em `main/master` e a cada `pull_request`.

## Workflow

Arquivo:

- [.github/workflows/ci.yml](/home/linuxadmin/repos/cartorio-financeiro/.github/workflows/ci.yml)

## Jobs

### 1. `backend-and-build`

Executa:

- `backend/npm ci`
- `frontend/npm ci`
- `backend/npm test`
- `frontend/npm run build`

### 2. `e2e`

Executa:

- PostgreSQL 16 como service
- install de `postgresql-client`
- `./scripts/bootstrap-local-env.sh --force`
- `./scripts/bootstrap-local-db.sh`
- `frontend/npm run e2e`

## Observacoes

- o job E2E usa a mesma seed sintética de desenvolvimento
- o backend do smoke reaplica migrations e seed antes de subir
- em falha, os artefatos do Playwright sao publicados

## Trigger

- `pull_request`
- `push` para `main`
- `push` para `master`
