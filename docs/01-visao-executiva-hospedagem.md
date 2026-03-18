# Visao Executiva de Hospedagem

Data de referencia: 18/03/2026.

## Contexto

O sistema atual foi desenhado como:

- backend Node.js + Express
- banco PostgreSQL
- frontend React/Vite
- uso interno de cartorio, com acesso remoto

Isso favorece provedores que aceitam bem aplicacao web customizada com Postgres gerenciado.

## Recomendacao objetiva

### Fase 1

Subir o MVP no Railway.

Motivos:

- menor friccao para publicar o backend atual
- setup mais rapido para validacao com o tabeliao
- menor carga operacional no inicio
- possibilidade de usar Postgres e servico web sem reescrever a aplicacao

### Fase 2

Migrar para Google Cloud quando houver:

- dados reais em volume crescente
- exigencia maior de auditoria e seguranca
- necessidade de reduzir risco operacional
- demanda por residencia de dados no Brasil e arquitetura mais controlada

## Comparativo resumido

| Criterio | Railway | Supabase | Google Cloud |
|---|---|---|---|
| Fit com o backend atual | Muito alto | Medio | Muito alto |
| Velocidade para publicar MVP | Muito alta | Media | Media |
| Curva operacional | Baixa | Media | Alta |
| Regiao Brasil | Nao identificada nos docs oficiais consultados | Sim | Sim |
| Bom para producao seria de cartorio | Parcial | Parcial | Sim |
| Risco de lock-in | Baixo | Medio/alto | Baixo/medio |
| Melhor uso | MVP rapido | BaaS com Auth/Storage | Operacao estavel de medio/longo prazo |

## Leitura por plataforma

### Railway

Pontos fortes:

- sobe Node.js/Express sem adaptacao relevante
- fluxo de deploy simples
- adequado para MVP interno
- custom domain e SSL sao diretos

Pontos fracos:

- sem vantagem clara de residencia no Brasil
- menos adequado como destino final para um sistema financeiro sensivel
- banco e operacao exigem mais disciplina do time do que uma stack gerenciada enterprise

Uso recomendado:

- prova de conceito
- homologacao com usuarios reais
- primeiros meses de operacao controlada

### Supabase

Pontos fortes:

- Postgres gerenciado
- Auth, MFA, Storage e backups integrados
- regiao em Sao Paulo

Pontos fracos:

- o backend atual nao encaixa naturalmente em Edge Functions
- para usar bem o produto, convem redesenhar partes do sistema
- se usado apenas como banco hospedado, parte do valor do produto fica desperdicada

Uso recomendado:

- quando a estrategia for adotar BaaS de verdade
- quando houver apetite para adaptar auth, storage e parte da API

### Google Cloud

Pontos fortes:

- melhor destino final para esse tipo de sistema
- Cloud Run aceita bem o backend atual via container
- Cloud SQL oferece Postgres gerenciado com opcao de HA
- disponibilidade em Sao Paulo
- melhor postura para seguranca, logs, IAM, rede privada e operacao futura

Pontos fracos:

- setup inicial mais trabalhoso
- custo do banco e da arquitetura sobe mais cedo
- exige mais maturidade operacional

Uso recomendado:

- producao estavel
- dados reais e historico financeiro
- fase de consolidacao do produto

## Estimativa inicial de custo

As faixas abaixo sao inferencias praticas para este projeto, nao cotacoes fechadas. Elas partem de uso interno administrativo, sem trafego publico intenso.

### Railway

Faixa mais provavel para MVP:

- 1 servico web pequeno sempre ligado
- 1 banco Postgres pequeno
- total estimado: entre US$ 20 e US$ 60 por mes

Pode subir se:

- houver mais ambiente
- crescer consumo de RAM
- o banco passar a exigir mais armazenamento e backup

### Supabase

Faixa mais provavel para inicio:

- plano pago base: a partir de US$ 25 por mes
- custom domain: em torno de US$ 10 por mes
- compute e add-ons variam conforme tamanho do projeto
- total provavel: entre US$ 25 e US$ 60 por mes no inicio

Fica mais caro se:

- precisarem de PITR
- subirem o porte do banco
- adicionarem varios ambientes pagos

### Google Cloud

Cloud Run:

- costuma ser barato em baixa carga
- para uso de backoffice pode ficar baixo no inicio

Cloud SQL:

- passa a ser o principal centro de custo

Faixa provavel:

- sem HA: entre US$ 80 e US$ 150 por mes
- com HA: entre US$ 160 e US$ 300 por mes

## Estimativa por porte de uso

### 5 usuarios internos

- Railway: custo mais racional
- Supabase: viavel, mas depende de querer usar recursos nativos da plataforma
- Google Cloud: tecnicamente melhor, mas provavelmente prematuro em custo

### 20 usuarios internos

- Railway ainda viavel
- Supabase ainda viavel
- Google Cloud comeca a fazer mais sentido se os dados forem operacionais de verdade

### 50 usuarios internos

- Railway ja merece revisao
- Supabase depende de quanto do ecossistema foi adotado
- Google Cloud vira o caminho mais defensavel

## Decisao recomendada

### Decisao principal

Publicar no Railway agora, mas com disciplina de portabilidade desde o dia 1.

### Regra de saida do Railway

Migrar para Google Cloud quando ocorrer um dos eventos abaixo:

- operacao diaria em producao real
- exigencia de auditoria mais forte
- necessidade de banco em Sao Paulo com postura mais controlada
- integracao com mais usuarios, escrituras e historico financeiro
- necessidade de separar homologacao e producao com mais rigor

## Fontes oficiais consultadas

- Railway pricing: https://railway.com/pricing
- Railway regions: https://docs.railway.com/deployments/regions
- Railway PostgreSQL: https://docs.railway.com/guides/postgresql
- Supabase pricing: https://supabase.com/pricing
- Supabase custom domains: https://supabase.com/docs/guides/platform/custom-domains
- Supabase backups: https://supabase.com/docs/guides/platform/backups
- Supabase functions: https://supabase.com/docs/guides/functions
- Google Cloud Run pricing: https://cloud.google.com/run/pricing
- Google Cloud Run locations: https://cloud.google.com/run/docs/locations
- Cloud SQL for PostgreSQL pricing: https://cloud.google.com/sql/docs/postgres/pricing
- Cloud SQL regions: https://docs.cloud.google.com/sql/docs/postgres/region-availability-overview
