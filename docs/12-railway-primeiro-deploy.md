# Primeiro Deploy no Railway

Data de referencia: 18/03/2026.

## Objetivo

Subir o primeiro ambiente remoto com o estado atual da base, sem reescrever deploy depois para GCP.

## Premissas

- imagem construída pelo [Dockerfile](/home/linuxadmin/repos/cartorio-financeiro/Dockerfile)
- frontend servido pelo backend em produção
- migrations aplicadas automaticamente no boot pelo [start-prod.sh](/home/linuxadmin/repos/cartorio-financeiro/backend/scripts/start-prod.sh)
- admin criado manualmente depois do primeiro boot

## O que já está preparado

- builder Docker no Railway via [railway.json](/home/linuxadmin/repos/cartorio-financeiro/railway.json)
- healthcheck em `/api/health`
- start de produção com migrations no boot em [start-prod.sh](/home/linuxadmin/repos/cartorio-financeiro/backend/scripts/start-prod.sh)
- imagem reproduzível com `npm ci` no [Dockerfile](/home/linuxadmin/repos/cartorio-financeiro/Dockerfile)

## Variáveis obrigatórias

- `NODE_ENV=production`
- `HOST=0.0.0.0`
- `PORT=3001`
- `DATABASE_URL=<connection string do Railway Postgres>`
- `DB_SSL=false`
- `JWT_SECRET=<segredo forte>`
- `JWT_EXPIRES_IN=8h`
- `APP_BASE_URL=https://app.seudominio.com.br`
- `CORS_ORIGIN=https://app.seudominio.com.br`

## Variáveis opcionais

- `RUN_MIGRATIONS_ON_BOOT=1`

## Passo a passo

### 1. Provisionar o banco

No projeto do Railway:

1. criar um serviço PostgreSQL
2. copiar a `DATABASE_URL`

### 2. Criar o serviço web

1. conectar o repositório
2. apontar para o `Dockerfile` da raiz
3. confirmar o healthcheck `/api/health`

### 3. Configurar env vars

Definir no serviço web:

- `NODE_ENV=production`
- `HOST=0.0.0.0`
- `PORT=3001`
- `DATABASE_URL`
- `DB_SSL=false`
- `JWT_SECRET`
- `JWT_EXPIRES_IN=8h`
- `APP_BASE_URL`
- `CORS_ORIGIN`
- `RUN_MIGRATIONS_ON_BOOT=1`

### 4. Primeiro boot

No primeiro deploy, a imagem:

1. sobe
2. executa `npm run migrate`
3. inicia `node server.js`

Validar:

- `GET /api/health`
- carregamento do frontend publicado pelo backend

### 5. Criar admin real

Depois do deploy inicial, executar no service web:

```bash
cd backend && \
ADMIN_NAME='Admin Real' \
ADMIN_EMAIL='admin@seudominio.com.br' \
ADMIN_PASSWORD='troque-esta-senha-imediatamente' \
npm run admin:create
```

Se usar Railway CLI:

```bash
railway run sh -lc "cd backend && ADMIN_NAME='Admin Real' ADMIN_EMAIL='admin@seudominio.com.br' ADMIN_PASSWORD='troque-esta-senha-imediatamente' npm run admin:create"
```

## Checklist de aceite

- deploy concluído sem crash loop
- `/api/health` respondendo `200`
- frontend carregando no domínio público
- login com admin real funcionando
- `CORS_ORIGIN` restrito ao domínio oficial
- banco com backup habilitado no Railway

## Riscos conhecidos

- migrations no boot são aceitáveis para um único web service, mas não é a estratégia final para scale-out
- `DB_SSL=false` é o default atual da base; revisar conforme o modo de conexão real usado no Railway
- o sistema ainda precisa de endurecimento adicional antes de operação contínua com dados reais
