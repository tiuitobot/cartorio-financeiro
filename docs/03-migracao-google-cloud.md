# Migracao posterior para Google Cloud

Data de referencia: 18/03/2026.

## Objetivo

Sair do Railway para uma arquitetura mais robusta quando o sistema deixar a fase inicial.

## Destino alvo

### Arquitetura recomendada

- frontend estatico em Cloud Storage + CDN ou servico equivalente
- backend Express em Cloud Run
- PostgreSQL em Cloud SQL
- segredos em Secret Manager
- logs em Cloud Logging
- backup e snapshots gerenciados no Cloud SQL

### Regiao recomendada

- `southamerica-east1` (Sao Paulo), sempre que disponivel para os componentes principais

## Criterios de disparo da migracao

Migrar quando houver um ou mais destes cenarios:

- sistema em operacao diaria do cartorio
- crescimento do historico financeiro
- demanda por maior controle de acesso e rede
- necessidade de homologacao e producao separadas com rigor
- auditoria, rastreabilidade e backups mais formais

## Estrategia de migracao

### Principio

Migrar infraestrutura primeiro, sem redesenhar regra de negocio no mesmo movimento.

### Etapas

1. containerizar a aplicacao de forma definitiva
2. padronizar variaveis de ambiente e segredos
3. versionar schema e seed
4. preparar banco destino no Cloud SQL
5. validar restauracao de dump no Cloud SQL
6. publicar API no Cloud Run
7. trocar frontend e dominio
8. executar cutover do banco
9. manter janela de rollback curta

## Compatibilidades a preservar no Railway

Para a migracao futura ser barata, o MVP deve obedecer a estas regras desde ja:

### Deploy

- build por Docker
- start da aplicacao por comando deterministico
- sem shell scripts acoplados ao provedor

### Banco

- PostgreSQL puro
- sem dependencia de extensao especifica de ambiente
- dump/restauracao testados

### Configuracao

- segredos por env vars
- configuracao fora do codigo
- sem hostnames hardcoded

### Observabilidade

- logs em stdout/stderr
- health endpoint simples
- readiness clara do servico

## Plano de cutover

### Fase 1. Preparacao

- congelar alteracoes estruturais no schema
- gerar dump consistente do banco atual
- restaurar em Cloud SQL
- validar contagem de registros e integridade

### Fase 2. Ambiente paralelo

- subir Cloud Run apontando para Cloud SQL
- publicar ambiente de homologacao
- validar login, atos, relatorios, reembolsos e reivindicacoes

### Fase 3. Janela de migracao

- colocar sistema antigo em manutencao
- tirar dump final
- restaurar dump final no Cloud SQL
- rodar verificacoes finais
- trocar DNS

### Fase 4. Pos-cutover

- monitorar logs
- validar usuarios chave
- manter Railway ativo por janela curta de contingencia

## Validacoes obrigatorias apos a migracao

- login
- troca de senha
- criacao e edicao de ato
- calculo de comissao
- exportacao de relatorios
- fluxo de reembolso
- fluxo de reivindicacao
- permissao por perfil
- backup do banco

## Riscos e mitigacoes

### Risco 1. Divergencia de schema

Mitigacao:

- usar migracoes versionadas
- nao alterar banco manualmente sem script

### Risco 2. Dependencia de configuracao do provedor antigo

Mitigacao:

- adotar Docker e env vars desde o inicio
- evitar comandos especiais do Railway no codigo

### Risco 3. Dados inconsistentes no banco atual

Mitigacao:

- corrigir unicidade de atos antes da migracao
- validar chaves e historicos

### Risco 4. Downtime mal controlado

Mitigacao:

- rodar ambiente paralelo antes do corte
- definir checklist de cutover
- ter rollback documentado

## Backlog tecnico para preparar a migracao

### Infra

- [ ] criar Dockerfile de producao
- [ ] criar pipeline de build
- [ ] criar `.env.example` unico do projeto
- [ ] criar `infra/gcp/` com manifests e comandos

### Banco

- [ ] criar migracoes versionadas
- [ ] revisar constraints de unicidade
- [ ] corrigir tipos de data/hora
- [ ] criar rotina de backup e restore testada

### Aplicacao

- [ ] mover calculos de negocio para backend
- [ ] revisar autorizacao por perfil
- [ ] adicionar health endpoint mais completo
- [ ] adicionar logs estruturados

### Produto

- [ ] definir politica de senha
- [ ] exigir troca de senha inicial
- [ ] revisar exposicao de dados por perfil
- [ ] definir processo de homologacao

## Ordem recomendada de investimento

1. corrigir regras criticas e seguranca
2. publicar MVP no Railway
3. validar com usuario real
4. containerizar e versionar infraestrutura
5. migrar para Cloud Run + Cloud SQL

## Resultado esperado

Se o MVP for publicado com essas regras, a migracao futura deixa de ser reescrita e vira principalmente:

- provisao de nova infra
- migracao de banco
- ajuste de DNS

Esse e o objetivo correto.
