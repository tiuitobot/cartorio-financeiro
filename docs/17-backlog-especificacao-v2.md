# Backlog Priorizado - Especificacao v2

Data de referencia: 20/03/2026.
Ultima auditoria: 23/03/2026.

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

## Progresso geral

| Prioridade | Total | Feito | Parcial | Pendente |
| --- | --- | --- | --- | --- |
| P1 | 16 | 16 | 0 | 0 |
| P2 | 5 | 5 | 0 | 0 |
| P3 | 12 | 12 | 0 | 0 |
| **Total** | **33** | **33** | **0** | **0** |

## P1 - Quick wins e correcoes de consistencia ✓ CONCLUIDO

Meta: entregar valor rapido sem mudar o dominio central.

| Item | Escopo | Status | Evidencia |
| --- | --- | --- | --- |
| 1.1 | sticky scrollbar em tabelas | ✓ feito | `StickyXScroll` usado em Atos, Relatorios, Importacoes, Escreventes, PainelUsuarios |
| 1.2 | ordenacao padrao de atos | ✓ feito | Backend: `ORDER BY data_ato DESC, livro DESC, pagina DESC`; frontend reflete |
| 1.3 | escreventes em ordem alfabetica | ✓ feito | Backend: `ORDER BY e.nome` |
| 2.1 | filtro por ano no dashboard | ✓ feito | Dashboard: seletor de ano com `anosDisponiveis` computado dos dados |
| 2.3 | correcao do Top Cobradores | ✓ feito | Dashboard: filtra por `status === 'pago'` |
| 2.4 | novo grafico do dashboard | ✓ feito | Grafico de barras "Faturado x Recebido x Pendente por Mes" |
| 3.1 fase 1 | colunas configuraveis via `localStorage` | ✓ feito | Atos.jsx persiste em `localStorage` por usuario |
| 3.2 | corrigir `data_ato` no modal | ✓ feito | ModalAto: `data_ato?.slice(0, 10)` normaliza input date |
| 3.3 | incluir Boleto e Vale | ✓ feito | `constants.js`: ambos em `FORMAS_PAGAMENTO` |
| 3.5 | destaque para recebimento nao confirmado | ✓ feito | Atos.jsx: "Lan" em laranja quando `conferenciaPendente` |
| 3.7 | busca por escrevente envolvido | ✓ feito | Backend: filtro `envolvido_id` em captador/executor/signatario; frontend: `fEnvolvido` |
| 5.1 | corrigir busca por Livro/Pagina | ✓ feito | `search.js`: `parseRef()` aceita `L00042P015` e `42/15` |
| 5.2 | incluir `nome_tomador` | ✓ feito | Campo no schema, ModalAto, busca textual, exibicao em Atos.jsx |
| 6.1 | ajustar listagem geral de comissoes | ✓ feito | Relatorios: aba Comissoes com total por escrevente, filtros por data e escrevente |
| 7.1 fase 1 | confirmacao/contestacao em reembolsos | ✓ feito | Backend: `PUT /reembolsos/:id/confirmar` e `/contestar`; frontend: ModalPgtoReembolso |
| 9.1 | taxa padrao 6% | ✓ feito | Frontend: default `taxa: 6`; backend: validacao `[6, 20, 30]`; import: default 6 |

## P2 - Mudancas estruturais do dominio financeiro ✓ CONCLUIDO

Meta: corrigir a modelagem onde a v2 muda a regra do negocio.

| Item | Escopo | Status | Evidencia |
| --- | --- | --- | --- |
| 3.4 | `pagamentos_ato` com multiplos pagamentos | ✓ feito | Migration 0007; `replacePagamentosAto()` no CRUD; UI com add/remove no ModalAto |
| 3.6 | status controlado por confirmacao financeiro | ✓ feito | Migration 0008 (`confirmado_financeiro`); `buildPagamentoState()` filtra confirmados; UI de confirmacao |
| 3.8 fase 1 | historico automatico por diff | ✓ feito | `ato-diff.js`: `buildAtoDiffMessage()` em PUT; insere em `correcoes` como registro automatico |
| 9.2 | `historico_taxas` com vigencia | ✓ feito | Migration 0011-0012; `escreventes_taxas_historico` com `vigencia_inicio`; lookup dinamico nas queries de atos |
| 6.2 | visao detalhada por escrevente | ✓ feito | Relatorios: sheet de detalhe com breakdown por ato, papel, base, percentual, comissao; export Excel |

Decisoes tecnicas implementadas:

- `pagamentos_ato` eh a base oficial de pagamentos
- `atos.valor_pago` derivado de `pagamentos_ato`
- `status` calculado via `buildPagamentoState()` com confirmacao financeira
- `correcoes` automaticas sao append-only (diff a cada PUT)
- historico preservado; visibilidade controlada na UI

## P3 - Modulos novos e expansao funcional

Meta: entrar nas funcionalidades novas que dependem de P1/P2.

### Pendencias (4.x) ✓ CONCLUIDO

| Item | Escopo | Status | Evidencia |
| --- | --- | --- | --- |
| 4.1 | tabela `pendencias` | ✓ feito | Migration 0013; campos completos (tipo, visivel, solucionado, chave_unica, metadata) |
| 4.2 | geracao automatica de pendencias | ✓ feito | `syncAutomaticPendenciasForAtoId()` gera PENDENCIA_PAGAMENTO, CONFIRMACAO_PENDENTE, INFORMACAO_INCOMPLETA |
| 4.3 | manifestacao manual do escrevente | ✓ feito | `POST /pendencias/manifestar`; ModalManifestarPendencia; validacao de relacao com ato |
| 4.4 | filtros da listagem | ✓ feito | `GET /pendencias` com tipo, escrevente_id, controle, inicio, fim, status; filtros no Relatorios |
| 4.5 | ciclo de vida das pendencias | ✓ feito | `PUT /:id` resolve/reabre; `PUT /:id/ocultar`; automaticas nao reabrem diretamente |
| 4.6 | permissoes por perfil | ✓ feito | `requirePerfil()`: manifestar=escrevente; resolver/ocultar=admin/financeiro/chefe_financeiro |

### Despesas de registro (8.x) ✓ CONCLUIDO

| Item | Escopo | Status | Evidencia |
| --- | --- | --- | --- |
| 8.1 | perfil `auxiliar_registro` | ✓ feito | Migration 0018; auth/escopo/UI dedicados; Chromium em homologacao validado |
| 8.2 | tabela `despesas_registro` | ✓ feito | Migration 0017; CRUD backend; pagina/modal dedicados; smoke e Chromium ok |
| 8.3 | regra de despesa apos pagamento | ✓ feito | `despesas_registro` enriquecida com impacto financeiro; ato pago mantido; homologacao validada |
| 8.4 | limitar alteracao de `reembolso_tabeliao` | ✓ feito | Regra explicita no backend/frontend com testes de regressao |

### Refinamentos ✓ CONCLUIDO

| Item | Escopo | Status | Evidencia |
| --- | --- | --- | --- |
| 3.1 fase 2 | persistencia de colunas no banco | ✓ feito | Tabela/API de preferencias; Atos e Relatorios persistem por usuario; Chromium com reload validado |
| 7.1 fase 2 | alerta financeiro e workflow de contestacao | ✓ feito | Contestacao gera alerta proativo e badge para o financeiro; homologacao validada |

## Ordem recomendada para itens restantes

Sem itens restantes deste backlog. O `P3` foi concluido em 24/03/2026 com validacao local e em homologacao Railway.

## Riscos por prioridade

### P1

- ~~baixo risco~~ → concluido sem incidentes

### P2

- ~~alto risco~~ → concluido; model financeiro validado em homolog

### P3

- risco funcional mitigado por validacao local + homologacao
- risco operacional remanescente: promover para producao com checklist de deploy e smoke
