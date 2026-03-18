# MVP no Railway, pronto para migrar depois

Data de referencia: 18/03/2026.

## Objetivo

Subir uma primeira versao utilizavel no Railway sem criar dependencia tecnica que atrapalhe a migracao futura para Google Cloud.

## Principio central

No Railway, a aplicacao deve ser tratada como:

- um container web stateless
- um banco PostgreSQL externo ao codigo
- configuracao 100% por variaveis de ambiente
- sem dependencias de filesystem local persistente
- sem servicos proprietarios do provedor no dominio da aplicacao

## Arquitetura do MVP

### Componentes

- frontend React compilado
- backend Express
- PostgreSQL gerenciado no Railway
- dominio customizado com HTTPS

### Topologia recomendada

1. um servico para a API
2. um banco PostgreSQL
3. frontend servido pelo proprio backend em producao, ou separado como static host

Para esse projeto, o caminho mais simples no inicio e:

- manter o backend servindo o build do frontend
- expor apenas um dominio publico

## Regras para manter portabilidade

### Banco

Usar somente PostgreSQL padrao:

- sem extensoes exoticas
- sem recursos proprietarios do Railway
- migracoes versionadas em SQL ou ferramenta padrao

### Aplicacao

Padronizar variaveis de ambiente:

- `PORT`
- `NODE_ENV`
- `DATABASE_URL`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `APP_BASE_URL`

Se possivel, preferir `DATABASE_URL` como entrada principal e manter as demais como fallback.

### Storage

Nao gravar arquivos no disco local do container.

Se no futuro houver:

- anexos
- relatorios persistidos
- comprovantes

usar um servico de objeto desacoplado, nao o filesystem da aplicacao.

### Sessao e auth

Manter auth no proprio backend, sem usar mecanismo nativo do Railway.

Assim a migracao futura fica simples.

## Passos de implantacao

### 1. Organizar o projeto

Antes do deploy:

- corrigir a estrutura do zip
- criar repositorio limpo
- adicionar `Dockerfile`
- adicionar `.dockerignore`
- definir build do frontend no pipeline
- definir start do backend por comando unico

### 2. Padronizar configuracao

Checklist:

- usar `process.env.PORT`
- ler conexao do banco por env vars
- externalizar CORS por ambiente
- remover credenciais padrao do instalador
- nao depender de caminhos absolutos do servidor Ubuntu antigo

### 3. Provisionar banco

No Railway:

- criar instancia PostgreSQL
- capturar credenciais e string de conexao
- registrar rotacao de senha em cofre interno ou password manager

### 4. Publicar API

No servico web:

- definir variaveis de ambiente
- apontar `DATABASE_URL`
- subir imagem ou codigo do backend
- validar `healthcheck`

### 5. Publicar frontend

Opcoes:

- mais simples: build do frontend embutido no backend
- mais limpo: frontend separado em host estatico

Para o MVP deste caso:

- manter frontend junto do backend simplifica operacao e reduz pontos de falha

### 6. Configurar dominio

Padrao sugerido:

- `app.seudominio.com.br`

Evitar:

- usar URL temporaria do provedor como URL oficial do sistema

### 7. Seguranca minima

Obrigatorio antes de uso real:

- remover senha fixa `admin123`
- forcar troca de senha no primeiro login
- usar `JWT_SECRET` forte
- limitar CORS por dominio
- restringir perfis e endpoints sensiveis
- habilitar backup e rotina de export do banco

## Ajustes tecnicos recomendados antes de publicar

### Alta prioridade

1. mover regra de comissao para o backend
2. tornar `controle` e/ou `livro + pagina` unicos no banco
3. corrigir o controle de permissao para `chefe_financeiro`
4. restringir listagens de reembolsos e reivindicacoes
5. trocar datas textuais por tipos `DATE` ou `TIMESTAMPTZ`
6. remover recriacao destrutiva do historico de correcoes

### Media prioridade

1. quebrar o `App.jsx` em modulos
2. adicionar migracoes versionadas
3. adicionar logs estruturados
4. adicionar seed de ambiente de homologacao
5. adicionar testes de regras de negocio

## Estrutura desejada do projeto

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
  .env.example
```

## Checklist de pronto para Railway

- [ ] repositorio limpo fora do zip
- [ ] Dockerfile funcional
- [ ] frontend buildando em pipeline
- [ ] backend lendo env vars
- [ ] banco provisionado
- [ ] healthcheck pronto
- [ ] dominio customizado configurado
- [ ] senha inicial segura
- [ ] backup testado
- [ ] usuario admin real criado manualmente

## O que nao fazer no MVP

- nao usar scripts de instalacao pensados para VM Ubuntu
- nao expor banco diretamente para internet sem necessidade
- nao depender de IP fixo do app
- nao salvar arquivos em disco local
- nao introduzir servicos proprietarios desnecessarios

## Meta do MVP

O MVP no Railway deve ser enxergado como:

- ambiente de validacao com usuario real
- base para refinamento de regras do cartorio
- etapa temporaria, nao destino final
