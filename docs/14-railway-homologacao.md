# Homologacao no Railway

Data de referencia: 19/03/2026.

## Objetivo

Manter um ambiente publico e isolado para testar:

- login
- fluxo real de importacao da planilha
- validacoes de preview
- importacao definitiva

sem tocar no servico de producao ja em uso.

## Decisao

Foi criado um **projeto Railway separado** para homologacao.

Nao usamos apenas um environment dentro do projeto principal porque, na pratica, isso nao entregou um dominio publico separado e utilizavel para teste web externo.

## Projeto de homologacao

- projeto: `cartorio-financeiro-homolog`
- servico web: `cartorio-web-homolog`
- banco: `Postgres-6d2K`
- URL publica: `https://cartorio-web-homolog-production.up.railway.app`

## Credenciais atuais

Ambiente seeded para homologacao:

- e-mail: `admin@cartorio.com`
- senha: `CartorioDev123`

Essas credenciais sao descartaveis e valem apenas para homologacao.

## Variaveis principais do servico web

- `NODE_ENV=production`
- `HOST=0.0.0.0`
- `PORT=3001`
- `DATABASE_URL=${{Postgres-6d2K.DATABASE_URL}}`
- `DB_SSL=false`
- `JWT_EXPIRES_IN=8h`
- `RUN_MIGRATIONS_ON_BOOT=1`
- `APP_BASE_URL=https://cartorio-web-homolog-production.up.railway.app`
- `CORS_ORIGIN=https://cartorio-web-homolog-production.up.railway.app`

## Estado validado

Foi validado:

- deploy do backend/frontend por container
- migrations no boot
- `GET /api/health` com `200`
- seed remota aplicada via `railway ssh`
- smoke remoto da importacao com lote controlado

Resultado do smoke remoto:

- `preview`: `2` linhas totais, `1` valida, `1` com erro
- `importacao`: `1` importada, `1` pulada
- ato importado confirmado: controle `990001`

## Operacao basica

### Reaplicar seed na homologacao

No projeto de homologacao:

```bash
railway ssh -s cartorio-web-homolog -e production "cd /app/backend && ALLOW_DEV_SEED=1 npm run seed:dev"
```

### Subir nova versao

Com o projeto `cartorio-financeiro-homolog` linkado localmente:

```bash
railway up --ci
```

### Verificar healthcheck

```bash
curl -i https://cartorio-web-homolog-production.up.railway.app/api/health
```

## Observacoes operacionais

- a pasta local **nao** deve ficar permanentemente linkada ao projeto de homologacao
- depois de usar a homologacao, religar o diretorio local ao projeto principal `secure-recreation`
- a homologacao e descartavel; se ficar muito suja, o caminho mais rapido e reaplicar a seed

## Relacao com o projeto principal

Projeto principal em producao:

- projeto: `secure-recreation`
- servico: `amiable-perfection`
- URL: `https://amiable-perfection-production-abd6.up.railway.app`

Projeto de homologacao:

- projeto: `cartorio-financeiro-homolog`
- servico: `cartorio-web-homolog`
- URL: `https://cartorio-web-homolog-production.up.railway.app`
