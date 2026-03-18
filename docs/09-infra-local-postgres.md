# Infra Local com PostgreSQL Nativo

Data de referencia: 18/03/2026.

## Objetivo

Este fluxo existe para validar a aplicacao localmente com banco real antes de subir para Railway.

O objetivo e separar erro de codigo de erro de infraestrutura cloud.

## Decisao

Fluxo local recomendado agora:

1. PostgreSQL nativo no ambiente local
2. backend Express rodando via `npm run dev`
3. frontend Vite rodando via `npm run dev`
4. smoke test com API real

`docker compose` continua util, mas deixou de ser o caminho principal de validacao.

## Scripts adicionados

- [scripts/bootstrap-local-env.sh](/home/linuxadmin/repos/cartorio-financeiro/scripts/bootstrap-local-env.sh)
  Gera `backend/.env` e `frontend/.env.local` com preset local. Nao sobrescreve arquivos existentes sem `--force`.

- [scripts/check-local-prereqs.sh](/home/linuxadmin/repos/cartorio-financeiro/scripts/check-local-prereqs.sh)
  Valida `node`, `npm`, `psql`, `createdb`, `createuser`, `curl` e avisa se o frontend ainda estiver em mock.

- [scripts/bootstrap-local-db.sh](/home/linuxadmin/repos/cartorio-financeiro/scripts/bootstrap-local-db.sh)
  Cria ou ajusta role e database do app a partir do `backend/.env`.

- [scripts/dev-api.sh](/home/linuxadmin/repos/cartorio-financeiro/scripts/dev-api.sh)
  Sobe a API a partir da raiz.

- [scripts/dev-web.sh](/home/linuxadmin/repos/cartorio-financeiro/scripts/dev-web.sh)
  Sobe o frontend a partir da raiz.

- [scripts/local-smoke.sh](/home/linuxadmin/repos/cartorio-financeiro/scripts/local-smoke.sh)
  Valida `/api/health` e, opcionalmente, login + `/api/auth/me`.

## Setup inicial

### 1. Instalar PostgreSQL

Ubuntu/WSL:

```bash
sudo apt-get update
sudo apt-get install -y postgresql postgresql-client
```

Se o cluster local nao subir sozinho:

```bash
sudo service postgresql start
```

## Bootstrap do projeto

### 1. Gerar arquivos de ambiente locais

```bash
cd /home/linuxadmin/repos/cartorio-financeiro
./scripts/bootstrap-local-env.sh
```

Se ja existir `frontend/.env.local` com mock ativo e voce quiser forcar a troca para API real:

```bash
./scripts/bootstrap-local-env.sh --force
```

### 2. Verificar prerequisitos

```bash
./scripts/check-local-prereqs.sh
```

### 3. Criar role e database do app

Por padrao, o script conecta como `postgres` ao banco `postgres`.

```bash
./scripts/bootstrap-local-db.sh
```

Se o seu ambiente exigir outro superusuario:

```bash
LOCAL_PG_SUPERUSER=meu_usuario ./scripts/bootstrap-local-db.sh
```

Se exigir senha do superusuario:

```bash
PGPASSWORD='sua-senha' ./scripts/bootstrap-local-db.sh
```

Se o cluster local estiver em auth via usuario de sistema e voce tiver sudo funcional:

```bash
LOCAL_PG_USE_SUDO=1 ./scripts/bootstrap-local-db.sh
```

Se o usuario de sistema nao for `postgres`:

```bash
LOCAL_PG_USE_SUDO=1 LOCAL_PG_SYSTEM_USER=meu_usuario_pg ./scripts/bootstrap-local-db.sh
```

### 4. Aplicar migrations

```bash
cd backend
npm run migrate
```

### 5. Criar admin local

Use este passo quando voce quiser uma base vazia controlada manualmente.

```bash
cd backend
ADMIN_NAME='Admin Local' \
ADMIN_EMAIL='admin@local.test' \
ADMIN_PASSWORD='troque-esta-senha-ja' \
npm run admin:create
```

### 6. Popular com dados sintéticos de desenvolvimento

Se voce nao tiver dados reais, use a seed local:

```bash
cd backend
npm run seed:dev
```

Observacao:

- `npm run seed:dev` limpa e recria as tabelas da aplicacao
- portanto, para ambiente dev, use **ou** `admin:create` em base vazia **ou** `seed:dev`
- se quiser um admin extra alem da seed, rode `admin:create` **depois** da seed

Senha padrao da seed:

- `CartorioDev123`

Logins da seed:

- `admin@cartorio.com`
- `chefe@cartorio.com`
- `financeiro@cartorio.com`
- `joao@cartorio.com`
- `maria@cartorio.com`

## Subida da stack

Backend:

```bash
cd /home/linuxadmin/repos/cartorio-financeiro
./scripts/dev-api.sh
```

Frontend:

```bash
cd /home/linuxadmin/repos/cartorio-financeiro
./scripts/dev-web.sh
```

Resultado esperado:

- API em `http://localhost:3001`
- health em `http://localhost:3001/api/health`
- frontend em `http://localhost:5173`

Observacao:

- se a `5173` estiver ocupada, o Vite pode subir em `5174`
- o preset local de `CORS_ORIGIN` ja foi ajustado para aceitar `5173`, `5174` e `4173` em `localhost` e `127.0.0.1`

## Smoke test

Health only:

```bash
cd /home/linuxadmin/repos/cartorio-financeiro
./scripts/local-smoke.sh
```

Health + login:

```bash
cd /home/linuxadmin/repos/cartorio-financeiro
SMOKE_EMAIL='admin@cartorio.com' \
SMOKE_PASSWORD='CartorioDev123' \
./scripts/local-smoke.sh
```

## Ordem recomendada de validacao

1. `./scripts/bootstrap-local-env.sh`
2. `./scripts/check-local-prereqs.sh`
3. `./scripts/bootstrap-local-db.sh`
4. `cd backend && npm run migrate`
5. `cd backend && npm run seed:dev`
6. `./scripts/dev-api.sh`
7. `./scripts/dev-web.sh`
8. `SMOKE_EMAIL=admin@cartorio.com SMOKE_PASSWORD='CartorioDev123' ./scripts/local-smoke.sh`

## O que isso valida

- leitura real de envs pelo backend
- conexao real com PostgreSQL
- migrations em banco limpo
- login com JWT
- proxy do frontend para API local

## Observacao importante sobre auth local do PostgreSQL

Em Ubuntu/WSL, o cluster costuma cair em um destes cenarios:

1. o superusuario `postgres` exige senha TCP em `localhost`
2. o acesso administrativo depende de `sudo -u postgres`

O script [bootstrap-local-db.sh](/home/linuxadmin/repos/cartorio-financeiro/scripts/bootstrap-local-db.sh) agora suporta os dois modelos, mas ele nao consegue adivinhar credenciais administrativas que so existem na sua maquina.

## O que isso ainda nao valida

- deploy cloud
- backups
- build de container
- comportamento com base legada
