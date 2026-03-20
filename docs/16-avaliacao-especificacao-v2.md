# Avaliacao da Especificacao v2

Data de referencia: 20/03/2026.

Documento avaliado:

- [26.03.20 Especificacao_Gestor_Notarial_v2.docx](/home/linuxadmin/repos/cartorio-financeiro/26.03.20%20Especificacao_Gestor_Notarial_v2.docx)

Base usada para a avaliacao:

- [backend/db/schema.sql](/home/linuxadmin/repos/cartorio-financeiro/backend/db/schema.sql)
- [backend/lib/finance.js](/home/linuxadmin/repos/cartorio-financeiro/backend/lib/finance.js)
- [backend/routes/atos.js](/home/linuxadmin/repos/cartorio-financeiro/backend/routes/atos.js)
- [frontend/src/pages/Dashboard.jsx](/home/linuxadmin/repos/cartorio-financeiro/frontend/src/pages/Dashboard.jsx)
- [frontend/src/pages/Relatorios.jsx](/home/linuxadmin/repos/cartorio-financeiro/frontend/src/pages/Relatorios.jsx)
- [frontend/src/components/modals/ModalAto.jsx](/home/linuxadmin/repos/cartorio-financeiro/frontend/src/components/modals/ModalAto.jsx)

## Resumo executivo

Leitura objetiva:

- a maior parte das recomendacoes do Henrique faz sentido
- varias entram como melhoria incremental
- algumas mudam o dominio financeiro e nao devem ser tratadas como patch
- o maior ponto de arquitetura e a combinacao entre:
  - multiplos pagamentos por ato
  - status controlado por confirmacao do financeiro
  - historico de taxa por data do ato

Classificacao usada neste documento:

- `Aceito`: pode entrar com baixo risco de desenho
- `Aceito com redesign`: faz sentido, mas precisa mudar o modelo ou a implementacao proposta
- `Ja atendido`: o sistema atual ja esta alinhado
- `Nao recomendo como escrito`: direcao valida, mas a forma proposta e fraca para auditoria ou manutencao

## Avaliacao item a item

### 1. Melhorias Gerais

| Item | Decisao | Impacto | Observacao |
| --- | --- | --- | --- |
| 1.1 Barra de rolagem lateral fixa | Aceito | Baixo | Melhoria de UX. Pode ser resolvida no frontend sem impacto de backend. |
| 1.2 Ordenacao padrao por data, livro e pagina | Aceito | Baixo | Hoje a ordenacao principal ainda esta incompleta. Faz sentido padronizar no backend e refletir no frontend. |
| 1.3 Escreventes em ordem alfabetica | Aceito | Baixo | Deve virar regra geral para seletores e listagens. |

### 2. Dashboard

| Item | Decisao | Impacto | Observacao |
| --- | --- | --- | --- |
| 2.1 Filtro por ano | Aceito | Baixo | Pode entrar primeiro no frontend e depois migrar para backend se o volume crescer. |
| 2.2 Top Captadores por emolumentos | Ja atendido | Nenhum | O dashboard atual ja usa `emolumentos`, nao o total do recibo. |
| 2.3 Top Cobradores por media de dias | Aceito | Baixo | A regra faz sentido, mas deve usar apenas atos `pago` e respeitar filtro de ano. |
| 2.4 Grafico faturado x recebido x pendente | Aceito | Medio | Troca de visualizacao. Nao exige mudanca de banco. |

### 3. Livros de Notas

| Item | Decisao | Impacto | Observacao |
| --- | --- | --- | --- |
| 3.1 Colunas configuraveis com persistencia | Aceito com redesign | Medio | Melhor fazer em 2 fases: `localStorage` agora, persistencia em banco depois. |
| 3.2 data_ato vazia no modal | Aceito | Baixo | Bug plausivel. Deve normalizar para `YYYY-MM-DD` no estado do formulario. |
| 3.3 Formas de pagamento: Boleto e Vale | Aceito | Baixo | Ajuste simples de lista e validacao. |
| 3.4 Multiplos pagamentos por ato | Aceito com redesign | Alto | Muda o modelo financeiro. `pagamentos_ato` deve virar fonte de verdade. |
| 3.5 Destaque para recebimento nao confirmado | Aceito | Baixo | Refinamento visual sobre um fluxo que ja existe. |
| 3.6 Status muda so com confirmacao do financeiro | Aceito com redesign | Alto | Hoje o status e calculado automaticamente. Se a regra mudar, precisa separar "situacao calculada" de "confirmacao financeira". |
| 3.7 Busca por escrevente envolvido | Aceito | Baixo | Filtro util e simples. |
| 3.8 Historico automatico de correcoes | Aceito com redesign | Medio | Diffs automaticos fazem sentido. A parte de apagar historico apos 60 dias nao e boa para auditoria. |

Leitura tecnica para 3.4 e 3.6:

- hoje o sistema assume um unico `valor_pago`, `data_pagamento` e `forma_pagamento` em [schema.sql](/home/linuxadmin/repos/cartorio-financeiro/backend/db/schema.sql)
- hoje o status e calculado por [finance.js](/home/linuxadmin/repos/cartorio-financeiro/backend/lib/finance.js) e persistido por [atos.js](/home/linuxadmin/repos/cartorio-financeiro/backend/routes/atos.js)
- portanto, esses dois itens nao sao ajuste de tela; sao mudanca de fonte de verdade

### 4. Relatorios > Conciliacao e Pendencias

| Item | Decisao | Impacto | Observacao |
| --- | --- | --- | --- |
| 4.1 Nova tabela `pendencias` | Aceito | Medio | O modelo proposto e bom como ponto de partida. |
| 4.2 Tipos automaticos de pendencia | Aceito com redesign | Medio | A geracao deve ocorrer em `save/import`, nao em `GET` da listagem. |
| 4.3 Manifestacao manual pelo escrevente | Aceito com redesign | Medio | Se o escrevente nao estiver no ato, a manifestacao deve existir sem expor o ato completo antes da aprovacao. |
| 4.4 Filtros da listagem | Aceito | Baixo | Requisito claro de UX/listagem. |
| 4.5 Ordenacao e ciclo de vida | Aceito com redesign | Baixo | Faz sentido usar `visivel=false` depois de 30 dias, mas nao apagar registro. |
| 4.6 Permissoes por perfil | Aceito | Baixo | Coerente com o modelo atual de visibilidade. |

### 5. Relatorios > Atos

| Item | Decisao | Impacto | Observacao |
| --- | --- | --- | --- |
| 5.1 Corrigir busca por Livro e Pagina | Aceito | Baixo | O filtro precisa normalizacao consistente entre frontend e backend. |
| 5.2 Coluna `nome_tomador` | Aceito | Medio | Adicao limpa de campo, formulario e coluna de relatorio. A importacao da planilha atual nao preenche isso. |

### 6. Relatorios > Comissoes

| Item | Decisao | Impacto | Observacao |
| --- | --- | --- | --- |
| 6.1 Listagem geral sem coluna taxa | Aceito | Baixo | A visao geral proposta e melhor que a atual. |
| 6.2 Visao detalhada por escrevente | Aceito com redesign | Medio | Fica correta de verdade apenas junto com `historico_taxas`. |

### 7. Relatorios > Reembolsos

| Item | Decisao | Impacto | Observacao |
| --- | --- | --- | --- |
| 7.1 Confirmacao e contestacao pelo escrevente | Aceito | Medio | O sistema ja tem base para confirmacao; falta a contestacao e o fluxo de alerta. |

### 8. Usuarios > Auxiliar de Registro

| Item | Decisao | Impacto | Observacao |
| --- | --- | --- | --- |
| 8.1 Novo perfil `auxiliar_registro` | Aceito com redesign | Alto | O perfil faz sentido. O problema e usar `atos` para registro dormente. |
| 8.2 Nova tabela `despesas_registro` | Aceito | Alto | Esse e o modelo certo para despesas antes do ato. |
| 8.3 Despesa apos pagamento nao altera status do ato | Aceito | Medio | Regra boa. Deve entrar junto com o dominio de `despesas_registro`. |
| 8.4 Escrevente nao altera `reembolso_tabeliao` | Aceito | Baixo | Regra de permissao coerente. |

Leitura tecnica para 8.1:

- nao recomendo criar "ato dormente" so para guardar `controle + reembolso_tabeliao`
- isso polui a tabela `atos`, conflita com campos obrigatorios e mistura despesa de registro com ato notarial
- a tabela `despesas_registro` ja resolve o problema sem violar o dominio principal

### 9. Escreventes

| Item | Decisao | Impacto | Observacao |
| --- | --- | --- | --- |
| 9.1 Taxa padrao 6% | Aceito | Baixo | Hoje o default visual ainda nao esta alinhado. |
| 9.2 Data de vigencia da mudanca de taxa | Aceito | Alto | Essencial para relatorio historico correto. Hoje a comissao depende da taxa atual do escrevente. |

## Pontos de atencao

### 1. Historico e auditoria

O item 3.8 esta certo na intencao e fraco na parte de descarte. Para este sistema:

- gerar diff automatico ao salvar faz sentido
- arquivar ou esconder historico antigo faz sentido
- apagar historico como regra operacional nao e a melhor escolha

### 2. Status financeiro

O item 3.6 conflita com o estado atual do sistema:

- hoje `status` e derivado de `valor_pago`
- se o Henrique quer confirmacao explicita do financeiro, o sistema precisa de um estado separado, por exemplo:
  - `status_calculado`
  - `confirmado_financeiro_em`
  - `confirmado_financeiro_por`

### 3. Pagamentos parcelados

O item 3.4 e o principal divisor de aguas desta versao:

- se entrar, a tela e o banco mudam juntos
- `valor_pago` deixa de ser dado de entrada unico
- o calculo de saldo, dashboard, relatorios e importacao passa a depender de `pagamentos_ato`

### 4. Historico de taxa

O item 9.2 afeta diretamente:

- calculo de comissao
- relatorios historicos
- detalhamento por escrevente

Sem isso, qualquer mudanca de taxa distorce o passado.

## Conclusao

A especificacao v2 esta bem encaminhada, mas mistura:

- melhorias simples de UX
- correcoes de consistencia
- e mudancas estruturais de dominio

Minha recomendacao e nao tratar tudo como um pacote unico.

Sequencia correta:

1. quick wins de UX, filtros, ordenacao e pequenos bugs
2. mudanca estrutural de pagamentos e confirmacao financeira
3. historico de taxas
4. conciliacao e pendencias
5. auxiliar de registro e despesas de registro
6. relatorios detalhados derivados desses novos modelos
