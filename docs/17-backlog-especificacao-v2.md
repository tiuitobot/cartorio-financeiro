# Backlog Priorizado - Especificacao v2

Data de referencia: 20/03/2026.

Documento base:

- [16-avaliacao-especificacao-v2.md](/home/linuxadmin/repos/cartorio-financeiro/docs/16-avaliacao-especificacao-v2.md)

## Objetivo

Transformar a especificacao v2 em um backlog executavel, separando:

- `P1`: ganhos rapidos e correcoes com baixo risco
- `P2`: mudancas de dominio que destravam a versao 2
- `P3`: modulos novos e refinamentos dependentes de P2

## Principios de sequenciamento

1. Nao misturar UX simples com mudanca estrutural de banco.
2. Nao mexer em comissoes historicas antes de resolver `historico_taxas`.
3. Nao mexer em status financeiro sem definir como isso conversa com pagamentos parcelados.
4. Nao usar `atos` para representar despesa de registro anterior ao ato.

## P1 - Quick wins e correcoes de consistencia

Meta: entregar valor rapido sem mudar o dominio central.

| Item | Escopo | Impacto tecnico | Dependencias | Observacao |
| --- | --- | --- | --- | --- |
| 1.1 | sticky scrollbar em tabelas | Baixo | Nenhuma | Frontend puro. |
| 1.2 | ordenacao padrao de atos | Baixo | Nenhuma | Ajustar backend e refletir no frontend. |
| 1.3 | escreventes em ordem alfabetica | Baixo | Nenhuma | Seletores e listagens. |
| 2.1 | filtro por ano no dashboard | Baixo | Nenhuma | Pode nascer no frontend. |
| 2.3 | correcao do Top Cobradores | Baixo | Nenhuma | Restringir para `status = pago`. |
| 2.4 | novo grafico do dashboard | Medio | 2.1 | Recharts no frontend. |
| 3.1 fase 1 | colunas configuraveis em Livros via `localStorage` | Baixo | Nenhuma | Persistencia em banco fica depois. |
| 3.2 | corrigir `data_ato` no modal | Baixo | Nenhuma | Bug/robustez de formulario. |
| 3.3 | incluir Boleto e Vale | Baixo | Nenhuma | Atualizar lista e validacao. |
| 3.5 | destaque para recebimento nao confirmado | Baixo | Nenhuma | UX. |
| 3.7 | busca por escrevente envolvido | Baixo | Nenhuma | Backend e filtro de listagem. |
| 5.1 | corrigir busca por Livro/Pagina | Baixo | Nenhuma | Backend deve normalizar. |
| 5.2 | incluir `nome_tomador` | Medio | Nenhuma | Migration simples + formulario + relatorio. |
| 6.1 | ajustar listagem geral de comissoes | Baixo | Nenhuma | Reorganizar a visao atual. |
| 7.1 fase 1 | confirmacao/contestacao em reembolsos | Medio | Nenhuma | Aproveitar base de `pagamentos_reembolso`. |
| 9.1 | taxa padrao 6% | Baixo | Nenhuma | Alinhar frontend e backend. |

Resultado esperado de P1:

- UX mais consistente
- dashboard mais confiavel
- livros e relatorios com filtros melhores
- nenhuma quebra estrutural de dados

## P2 - Mudancas estruturais do dominio financeiro

Meta: corrigir a modelagem onde a v2 muda a regra do negocio.

| Item | Escopo | Impacto tecnico | Dependencias | Observacao |
| --- | --- | --- | --- | --- |
| 3.4 | `pagamentos_ato` com multiplos pagamentos | Alto | Nenhuma | Nova fonte de verdade de pagamentos. |
| 3.6 | status controlado por confirmacao do financeiro | Alto | 3.4 | Precisa separar valor lancado de confirmacao. |
| 3.8 fase 1 | historico automatico por diff | Medio | Nenhuma | Gerar diff no backend a cada `PUT`. |
| 9.2 | `historico_taxas` com vigencia | Alto | Nenhuma | Recalculo historico de comissoes. |
| 6.2 | visao detalhada por escrevente | Medio | 9.2 | So fica correta depois do historico de taxas. |

Decisoes tecnicas recomendadas em P2:

- `pagamentos_ato` vira base oficial
- `atos.valor_pago` passa a ser derivado ou cacheado
- `status` nao pode mais ser apenas `calcStatus(valor_pago)`
- `correcoes` automaticas devem ser append-only
- nao apagar historico; no maximo ocultar da UI

Resultado esperado de P2:

- modelo financeiro menos fragil
- suporte a pagamento parcelado e combinado
- relatorios historicos mais corretos
- menor risco de divergencia entre tela e banco

## P3 - Modulos novos e expansao funcional

Meta: entrar nas funcionalidades novas que dependem de P1/P2.

| Item | Escopo | Impacto tecnico | Dependencias | Observacao |
| --- | --- | --- | --- | --- |
| 4.1 | tabela `pendencias` | Medio | Nenhuma | Base do novo modulo. |
| 4.2 | geracao automatica de pendencias | Medio | 4.1, 3.4, 3.6 | Fazer em `save/import`, nao em `GET`. |
| 4.3 | manifestacao manual do escrevente | Medio | 4.1 | Fluxo separado quando o escrevente nao estiver no ato. |
| 4.4 | filtros da listagem | Baixo | 4.1 | Frontend e query de listagem. |
| 4.5 | ciclo de vida das pendencias | Baixo | 4.1 | `visivel=false`, nao delete fisico. |
| 4.6 | permissoes por perfil | Baixo | 4.1 | Regras de escopo. |
| 8.1 | perfil `auxiliar_registro` | Medio | 8.2 | Nao criar "ato dormente". |
| 8.2 | tabela `despesas_registro` | Alto | Nenhuma | Novo subdominio. |
| 8.3 | regra de despesa apos pagamento | Medio | 8.2, 3.6 | Nao alterar status do ato. |
| 8.4 | limitar alteracao de `reembolso_tabeliao` | Baixo | 8.2 | Regra de permissao. |
| 3.1 fase 2 | persistencia de colunas no banco | Medio | Nenhuma | Melhor fazer junto de preferencias de usuario. |
| 7.1 fase 2 | alerta financeiro e workflow completo de contestacao | Medio | 4.1 | Pode compartilhar infraestrutura com pendencias. |

Resultado esperado de P3:

- modulo de conciliacao operacional
- controle de pendencias e manifestacoes
- fluxo separado para despesas de registro
- melhor governanca sobre reembolsos e excecoes

## Ordem recomendada de implementacao

### Bloco A - Rapido

- 1.2
- 1.3
- 2.1
- 2.3
- 3.2
- 3.3
- 3.5
- 3.7
- 5.1
- 9.1

### Bloco B - Interface e relatorios

- 1.1
- 2.4
- 3.1 fase 1
- 5.2
- 6.1
- 7.1 fase 1

### Bloco C - Dominio financeiro

- 3.4
- 3.6
- 3.8 fase 1
- 9.2
- 6.2

### Bloco D - Novos modulos

- 4.1 a 4.6
- 8.2
- 8.1
- 8.3
- 8.4

## Riscos por prioridade

### P1

- baixo risco
- risco principal e so regressao de filtro/listagem

### P2

- alto risco
- mexe em pagamentos, status e comissoes
- exige migration e teste ponta a ponta

### P3

- medio a alto risco
- adiciona modulos novos e mais estados operacionais
- precisa de regras de permissao e auditoria consistentes

## Recomendacao objetiva

Se a meta for colocar valor na mao do Henrique sem destabilizar o sistema:

1. fechar P1 primeiro
2. desenhar P2 antes de codar
3. so depois abrir P3

Se a meta for atender a v2 inteira com qualidade, o maior cuidado deve estar em:

- `pagamentos_ato`
- confirmacao financeira
- `historico_taxas`

Esses tres pontos definem a confiabilidade do produto para frente.
