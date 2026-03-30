# Onboarding Tecnico

Data de referencia: 30/03/2026 (atualizado; original: 18/03/2026).

## Objetivo

Este documento serve para uma pessoa nova entrar no projeto com o minimo de atrito.

O foco atual do repositorio e:

- recuperar uma base limpa a partir do zip original
- preparar a aplicacao para deploy cloud-portable
- viabilizar um MVP no Railway
- deixar a migracao para Google Cloud encaminhada

## O que e o sistema

Sistema web de gestao financeira para cartorio de notas, com:

- autenticacao por perfil (admin, financeiro, chefe_financeiro, escrevente, auxiliar_registro)
- troca obrigatoria de senha no primeiro login
- cadastro de escreventes e usuarios
- lancamento e consulta de atos
- calculo de comissoes com historico de taxas por vigencia
- relatorios e exportacao
- reembolsos com workflow de contestacao
- reivindicacoes de participacao em ato
- importacao de planilhas XLSX com staging e preview
- pendencias automaticas e manuais com manifestacao
- despesas de registro (separado de atos)
- persistencia de preferencias de colunas por usuario

## Stack atual

### Backend

- Node.js
- Express
- PostgreSQL
- JWT

### Frontend

- React
- Vite

### Infra

- **atual**: Railway (producao e homologacao ativos)
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

- `npm run migrate` — aplica migrations sequenciais
- `npm run admin:create` — cria usuario admin (usa env vars ADMIN_*)
- `npm run seed:dev` — popula dados de desenvolvimento (limpa tabelas antes)
- `npm run pendencias:sync` — sincroniza pendencias automaticas
- `npm run reset:empty` — reseta base para estado vazio
- `npm test` — roda 60 testes unitarios

Executar a partir de `frontend/`:

- `npm run e2e` — suite E2E com Playwright

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
- middleware auth retorna HTTP 428 se usuario precisa trocar senha (exceto `/api/auth/me` e `/api/auth/senha`)
- perfil `auxiliar_registro` so acessa `/api/despesas-registro`
- pendencias automaticas sincronizadas ao criar/editar atos

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

### Validado desde a escrita original

- deploy real no Railway (producao e homologacao ativos desde 23/03/2026)
- execucao ponta a ponta com banco real em homologacao e producao
- aplicacao de migrations em banco com dados existentes (19 migrations aplicadas)
- build real do container (Dockerfile validado no Railway)

### Nao validado ainda

- deploy real no Google Cloud
- `docker compose up --build` em ambiente local com Docker

## Regras para mexer nessa base

1. nao usar o `instalar.sh` como estrategia principal de deploy
2. nao introduzir dependencia proprietaria do Railway no dominio da aplicacao
3. manter PostgreSQL puro
4. manter a configuracao por env vars
5. evitar salvar arquivos em disco local do container
6. nao recolocar senha padrao de admin no fluxo

## Riscos conhecidos do produto

1. regras criticas ainda ficam parcialmente no frontend
2. o modelo de auditoria do banco ainda e fraco (campos textuais)
3. a matriz de visibilidade ainda precisa de homologacao por perfil, embora `reembolsos`, `reivindicacoes` e `pendencias` ja filtrem por escopo
4. ~~faltam migracoes versionadas~~ — existem 19 migrations versionadas (0001-0019)
5. ~~faltam testes automatizados~~ — 60 testes unitarios + suite E2E Playwright

## Ambientes Railway

### Producao

- projeto: `secure-recreation`
- servico: `amiable-perfection`
- URL: `https://amiable-perfection-production-abd6.up.railway.app`
- link local: `railway link -p secure-recreation -s amiable-perfection -e production`

### Homologacao

- projeto: `cartorio-financeiro-homolog`
- servico: `cartorio-web-homolog`
- URL: `https://cartorio-web-homolog-production.up.railway.app`
- credenciais de seed: `admin@cartorio.com` / `CartorioDev123`
- detalhes: [docs/14-railway-homologacao.md](/home/linuxadmin/repos/cartorio-financeiro/docs/14-railway-homologacao.md)

### Armadilhas

- **NUNCA** rodar `railway up` de dentro de `frontend/` — Railway auto-detecta como site estatico e mata o backend
- Apos operar na homologacao, relinkar para producao
- Healthcheck timeout em 600s (`railway.json`) — migrations levam ~5-7min
- Detalhes: [docs/22-deploy-incidents-2026-03-23.md](/home/linuxadmin/repos/cartorio-financeiro/docs/22-deploy-incidents-2026-03-23.md)

## Ordem recomendada para uma pessoa nova continuar

1. ler [docs/05-handoff-status-atual.md](/home/linuxadmin/repos/cartorio-financeiro/docs/05-handoff-status-atual.md)
2. rodar o ambiente local com [docs/09-infra-local-postgres.md](/home/linuxadmin/repos/cartorio-financeiro/docs/09-infra-local-postgres.md)
3. validar `GET /api/health` e `npm run migrate` em Postgres limpo (19 migrations)
4. rodar `npm test` no backend (60 testes) e `npm run build` no frontend
5. conhecer os ambientes Railway (producao e homologacao) listados acima

## Quando pedir contexto adicional

Pedir contexto ao responsavel quando surgir uma destas situacoes:

- definicao exata das regras de comissao do cartorio
- exigencia de auditoria formal
- politica de senha e acesso remoto
- estrategia de backup e retencao
- necessidade de anexos e storage
