# Importacao da Planilha do Controle Diario

Data de referencia: 19/03/2026.

## Objetivo desta rodada

Preparar o sistema para receber a planilha [Controle_Diario_2026_padronizado.xlsx](/home/linuxadmin/repos/cartorio-financeiro/Controle_Diario_2026_padronizado.xlsx) e operar esse fluxo tambem pelo frontend.

Nesta fase foi preparada a trilha de:

- upload do arquivo `.xlsx`
- parse e normalizacao
- validacao por linha
- persistencia em staging
- preview para o frontend
- tela frontend para upload, preview, listagem de lotes e importacao

Depois da definicao do Henrique, a trilha inicial de importacao definitiva tambem foi preparada com a seguinte regra provisoria:

- `ESCREVENTE` da planilha vira `captador_id`
- `executor_id` fica `NULL`
- `signatario_id` fica `NULL`

## O que ja esta implementado

### Banco

Foram criadas tabelas de staging:

- [0003_import_lotes_preview.sql](/home/linuxadmin/repos/cartorio-financeiro/backend/db/migrations/0003_import_lotes_preview.sql)
- `import_lotes`
- `import_linhas`

Essas tabelas guardam:

- nome e hash do arquivo
- aba lida
- resumo do lote
- linhas normalizadas
- erros e alertas por linha

### Backend

Foi adicionado parser dedicado para a planilha:

- [controle-diario-import.js](/home/linuxadmin/repos/cartorio-financeiro/backend/lib/controle-diario-import.js)

Endpoints novos:

- `POST /api/importacoes/planilha/preview`
- `POST /api/importacoes/:id/importar`
- `GET /api/importacoes`
- `GET /api/importacoes/:id`

Rota:

- [importacoes.js](/home/linuxadmin/repos/cartorio-financeiro/backend/routes/importacoes.js)

Montagem da rota:

- [server.js](/home/linuxadmin/repos/cartorio-financeiro/backend/server.js)

### Frontend

Foi adicionada a tela:

- [Importacoes.jsx](/home/linuxadmin/repos/cartorio-financeiro/frontend/src/pages/Importacoes.jsx)

Integracao:

- [App.jsx](/home/linuxadmin/repos/cartorio-financeiro/frontend/src/App.jsx)
- [api.js](/home/linuxadmin/repos/cartorio-financeiro/frontend/src/api.js)

A tela cobre:

- upload da planilha
- geracao do preview
- consulta de lotes recentes
- consulta de detalhe do lote
- importacao definitiva do lote

## Contrato atual da API

### `POST /api/importacoes/planilha/preview`

Autorizacao:

- `admin`
- `financeiro`
- `chefe_financeiro`

Formato:

- `multipart/form-data`
- campo do arquivo: `arquivo`

Resposta:

- cria um lote em staging
- devolve `lote_id`
- devolve `summary`
- devolve ate 100 linhas em `preview_rows`

### `GET /api/importacoes`

Lista os lotes mais recentes com resumo.

### `GET /api/importacoes/:id`

Devolve:

- metadados do lote
- paginação
- linhas persistidas em staging

### `POST /api/importacoes/:id/importar`

Importa em `atos` apenas as linhas elegiveis do lote.

Regras da rodada atual:

- exige `captador` resolvido a partir do nome do `ESCREVENTE`
- `executor_id` e `signatario_id` ficam `NULL`
- linhas com erro de parse continuam bloqueadas
- linhas com conflito de unicidade ou escrevente nao cadastrado sao rejeitadas

Assuncoes atuais:

- se a planilha trouxer `Data Pagamento` ou `Confirmacao Recebimento`, o sistema infere `valor_pago = total do ato`
- se nao houver sinal de quitacao, `valor_pago = 0`

## Leitura da versao atual da planilha

Resumo real da planilha atualizada em 18/03/2026:

- 1 aba: `Livro de Escrituras`
- 324 linhas uteis
- 14 colunas
- novas colunas relevantes: `Repasses` e `ISSQN`

Cabecalho lido:

- `DATA DO ATO`
- `ATO`
- `Livro`
- `Pagina`
- `CONTROLE`
- `ESCREVENTE`
- `EMOLUMENTOS`
- `Repasses`
- `ISSQN`
- `Data Pagamento`
- `Confirmacao Recebimento`
- `FORMA DE PG`
- `CONTROLE CHEQUES`

Resultado do preview real com a planilha atual:

- `324` linhas totais
- `321` linhas validas
- `3` linhas com erro
- `39` linhas com alerta

Alertas de arquivo detectados:

- `Repasses` sem valores preenchidos
- `ISSQN` sem valores preenchidos

Erros criticos detectados no arquivo atual:

- 1 linha sem `ATO`
- 1 linha sem `DATA DO ATO`
- 1 linha sem `Pagina`
- 1 data fora do intervalo esperado: `1908-09-30`

## O que ainda depende do Henrique

### 1. Papel do `ESCREVENTE`

Definicao recebida:

- `ESCREVENTE` vira `captador_id`

Ainda em aberto:

- regra para `executor_id`
- regra para `signatario_id`

### 2. Estrategia para `CONTROLE`

Ja foi ajustado:

- `atos.controle` agora aceita mais de 5 digitos
- o backend preserva controles longos e continua padronizando controles curtos para no minimo 5 digitos

### 3. Campos faltantes no modelo final

Ja foi ajustado:

- `ATO` entra em `atos.tipo_ato`
- `CONTROLE CHEQUES` entra em `atos.controle_cheques`

### 4. Regra provisoria de pagamento

A planilha nao traz `valor_pago` explicito.

Nesta rodada, a importacao definitiva usa a seguinte inferencia:

- com `Data Pagamento` ou `Confirmacao Recebimento`: considera quitado e define `valor_pago = total`
- sem sinal de quitacao: `valor_pago = 0`

Isso funciona como passo inicial, mas deve ser homologado com o cartorio.

## Proximo passo tecnico recomendado

Quando o Henrique definir o papel do `ESCREVENTE`, a sequencia correta e:

1. fechar o mapeamento `planilha -> atos`
2. confirmar com o Henrique a regra provisoria de pagamento
3. definir como `executor_id` e `signatario_id` serao preenchidos
4. homologar com o cartorio o fluxo real de importacao no frontend
5. registrar conflitos de duplicidade e linhas rejeitadas por lote

## Validacao executada

Foi validado localmente com banco real:

- migration `0003` aplicada
- migration `0004` aplicada
- upload real da planilha atualizada
- lote persistido em staging
- consulta do lote persistido
- importacao definitiva parcial validada
- testes unitarios do parser
- tela frontend de importacoes validada ponta a ponta com Playwright
- preview da planilha real revalidado em 19/03/2026:
  - `324` linhas totais
  - `321` validas
  - `3` com erro
  - `39` com alerta
