# Onboarding Tecnico

Data de referencia: 18/03/2026.

## Objetivo

Este documento serve para uma pessoa nova entrar no projeto com o minimo de atrito.

O foco atual do repositorio e:

- recuperar uma base limpa a partir do zip original
- preparar a aplicacao para deploy cloud-portable
- viabilizar um MVP no Railway
- deixar a migracao para Google Cloud encaminhada

## O que e o sistema

Sistema web de gestao financeira para cartorio de notas, com:

- autenticacao por perfil
- cadastro de escreventes e usuarios
- lancamento e consulta de atos
- calculo de comissoes
- relatorios e exportacao
- reembolsos
- reivindicacoes de participacao em ato

## Stack atual

### Backend

- Node.js
- Express
- PostgreSQL
- JWT

### Frontend

- React
- Vite

### Infra alvo

- curto prazo: Railway
- medio prazo: Google Cloud Run + Cloud SQL

## Estrutura do repositorio

```text
cartorio-financeiro/
  backend/
  frontend/
  docs/
  infra/
    railway/
    gcp/
  Dockerfile
  docker-compose.yml
  railway.json
  .env.example
```

## Arquivos que merecem leitura primeiro

1. [README.md](/home/linuxadmin/repos/cartorio-financeiro/README.md)
2. [docs/01-visao-executiva-hospedagem.md](/home/linuxadmin/repos/cartorio-financeiro/docs/01-visao-executiva-hospedagem.md)
3. [docs/02-mvp-railway-runbook.md](/home/linuxadmin/repos/cartorio-financeiro/docs/02-mvp-railway-runbook.md)
4. [docs/03-migracao-google-cloud.md](/home/linuxadmin/repos/cartorio-financeiro/docs/03-migracao-google-cloud.md)
5. [docs/05-handoff-status-atual.md](/home/linuxadmin/repos/cartorio-financeiro/docs/05-handoff-status-atual.md)

## Origem do codigo

O material original veio em um zip:

- `cartorio server.zip`

O zip estava mal empacotado, com diretorios literais contendo chaves. O codigo util foi extraido e reorganizado manualmente no repositorio atual.

Arquivos preservados da origem:

- [README.upstream.md](/home/linuxadmin/repos/cartorio-financeiro/README.upstream.md)
- [instalar.sh](/home/linuxadmin/repos/cartorio-financeiro/instalar.sh)
- [ecosystem.config.js](/home/linuxadmin/repos/cartorio-financeiro/ecosystem.config.js)

Esses arquivos existem como referencia historica. O caminho de deploy recomendado hoje nao depende deles.

## Como rodar localmente

### Opcao recomendada

Usar PostgreSQL nativo no ambiente local e subir backend/frontend separadamente.

Passos esperados:

1. gerar envs locais:

```bash
./scripts/bootstrap-local-env.sh
```

2. verificar prerequisitos:

```bash
./scripts/check-local-prereqs.sh
```

3. preparar role e database locais:

```bash
./scripts/bootstrap-local-db.sh
```

4. aplicar migrations:

```bash
cd backend
npm run migrate
```

5. subir API e frontend:

```bash
./scripts/dev-api.sh
./scripts/dev-web.sh
```

Resultado esperado no fluxo local nativo:

- app em `http://localhost:3001`
- frontend em `http://localhost:5173`
- banco Postgres local em `localhost:5432`

### Opcao manual

Se a pessoa quiser rodar fora de container:

1. instalar dependencias do backend
2. instalar dependencias do frontend
3. subir um Postgres local
4. aplicar o schema em `backend/db/schema.sql`
5. rodar backend e frontend separadamente

Runbook detalhado:

- [docs/09-infra-local-postgres.md](/home/linuxadmin/repos/cartorio-financeiro/docs/09-infra-local-postgres.md)

## Variaveis de ambiente relevantes

Arquivo raiz de referencia:

- [.env.example](/home/linuxadmin/repos/cartorio-financeiro/.env.example)

Variaveis mais importantes:

- `DATABASE_URL`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_SSL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `HOST`
- `PORT`
- `APP_BASE_URL`
- `CORS_ORIGIN`
- `VITE_PROXY_TARGET`
- `VITE_API_BASE_URL`

## Como o projeto foi adaptado para cloud

### Banco

O backend agora aceita:

- `DATABASE_URL` como entrada principal
- env vars separadas como fallback

### Rede

O backend agora:

- sobe em `0.0.0.0`
- usa `PORT` configuravel
- aceita `CORS_ORIGIN` por ambiente

### Frontend

O frontend agora:

- aceita `VITE_API_BASE_URL`
- aceita `VITE_PROXY_TARGET` no dev server

### Deploy

O projeto agora possui:

- `Dockerfile` multi-stage
- `docker-compose.yml`
- `railway.json`
- scripts de bootstrap local
- exemplo de deploy para Cloud Run
- script de migrations do banco
- script seguro de criacao de admin
- testes unitarios da camada financeira
- testes unitarios da camada de auditoria/data
- validacao e enriquecimento financeiro de atos no backend

## Scripts operacionais do backend

Executar a partir de `backend/`:

- `npm run migrate`
- `npm run admin:create`
- `npm run seed:dev`
- `npm test`

Executar a partir de `frontend/`:

- `npm run e2e`

Automação remota:

- GitHub Actions em [ci.yml](/home/linuxadmin/repos/cartorio-financeiro/.github/workflows/ci.yml)

Deploy inicial:

- Railway em [12-railway-primeiro-deploy.md](/home/linuxadmin/repos/cartorio-financeiro/docs/12-railway-primeiro-deploy.md)

Comportamentos importantes ja assumidos pelo backend:

- `GET/POST/PUT /api/atos` retornam `total`, `comissoes` e `reembolso_devido_escrevente`
- `verificado_em` passa a ser definido pelo servidor
- `correcoes.data` passa a ser definida/preservada pelo servidor
- `reivindicacoes.data` passa a ser definida pelo servidor
- criacao/edicao de ato rejeita `controle`, `livro` ou `pagina` vazios
- criacao/edicao de ato rejeita valores monetarios negativos
- `reembolso_escrevente > 0` exige `escrevente_reembolso_id`

### Uso esperado de `npm run admin:create`

Variaveis necessarias:

- `ADMIN_NAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Variaveis opcionais:

- `ADMIN_PERFIL`
- `ADMIN_ESCREVENTE_ID`

### Uso esperado de `npm run seed:dev`

- cria uma base sintética de desenvolvimento
- limpa as tabelas da aplicação antes de inserir os dados
- não deve ser usada em produção
- se você rodar `seed:dev`, qualquer admin manual deve ser recriado depois, se ainda for necessário

## Estado de confianca da base

### Validado

- sintaxe do backend
- sintaxe do script de exemplo do GCP
- validade do `railway.json`
- reorganizacao da estrutura do projeto
- testes unitarios do backend
- `npm install` de backend e frontend
- `npm run build` do frontend

### Nao validado ainda

- build real do container
- execucao ponta a ponta com banco
- deploy real no Railway
- deploy real no Google Cloud
- aplicacao das migrations em banco legado com dados existentes

## Regras para mexer nessa base

1. nao usar o `instalar.sh` como estrategia principal de deploy
2. nao introduzir dependencia proprietaria do Railway no dominio da aplicacao
3. manter PostgreSQL puro
4. manter a configuracao por env vars
5. evitar salvar arquivos em disco local do container
6. nao recolocar senha padrao de admin no fluxo

## Riscos conhecidos do produto

1. regras criticas ainda ficam parcialmente no frontend
2. o modelo de auditoria do banco ainda e fraco
3. a matriz de visibilidade ainda precisa de homologacao por perfil, embora `reembolsos` e `reivindicacoes` ja filtrem `escrevente`
4. faltam migracoes versionadas
5. faltam testes automatizados

## Ordem recomendada para uma pessoa nova continuar

1. ler [docs/05-handoff-status-atual.md](/home/linuxadmin/repos/cartorio-financeiro/docs/05-handoff-status-atual.md)
2. rodar [docs/09-infra-local-postgres.md](/home/linuxadmin/repos/cartorio-financeiro/docs/09-infra-local-postgres.md)
3. validar `GET /api/health`
4. aplicar `npm run migrate` em um Postgres limpo e confirmar a migration `0002`
5. endurecer seguranca minima
6. preparar primeiro deploy real no Railway

## Quando pedir contexto adicional

Pedir contexto ao responsavel quando surgir uma destas situacoes:

- definicao exata das regras de comissao do cartorio
- exigencia de auditoria formal
- politica de senha e acesso remoto
- estrategia de backup e retencao
- necessidade de anexos e storage
