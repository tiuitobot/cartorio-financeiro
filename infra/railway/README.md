# Deploy inicial no Railway

## Modelo recomendado

- 1 service web usando o `Dockerfile` da raiz
- 1 banco PostgreSQL provisionado no Railway
- 1 dominio customizado para a aplicacao

## Variaveis de ambiente minimas

- `NODE_ENV=production`
- `HOST=0.0.0.0`
- `PORT=3001`
- `DATABASE_URL=<fornecida pelo Railway Postgres>`
- `DB_SSL=false`
- `JWT_SECRET=<segredo forte>`
- `JWT_EXPIRES_IN=8h`
- `APP_BASE_URL=https://app.seudominio.com.br`
- `CORS_ORIGIN=https://app.seudominio.com.br`

## Healthcheck

- caminho: `/api/health`

## Processo recomendado

1. criar o banco PostgreSQL
2. subir o service com o `Dockerfile`
3. configurar as variaveis de ambiente
4. validar `/api/health`
5. deixar `RUN_MIGRATIONS_ON_BOOT=1` no primeiro deploy
6. criar um usuario admin real com senha forte via `npm run admin:create`
7. configurar dominio e HTTPS

## Start do container

O container agora inicia por:

- [start-prod.sh](/home/linuxadmin/repos/cartorio-financeiro/backend/scripts/start-prod.sh)

Fluxo:

1. `npm run migrate`
2. `node server.js`

Isso reduz o risco do primeiro boot subir com banco sem schema.

## Comando para criar admin

Se usar Railway CLI:

```bash
railway run sh -lc "cd backend && ADMIN_NAME='Admin Real' ADMIN_EMAIL='admin@seudominio.com.br' ADMIN_PASSWORD='troque-esta-senha-imediatamente' npm run admin:create"
```

## Pontos de atencao

- nao usar o `instalar.sh` no Railway
- nao manter credencial padrao `admin123`
- nao usar URL temporaria do Railway como URL oficial
- manter export de dump periodico do banco
- revisar `DB_SSL` no ambiente real do Railway antes do cutover final
