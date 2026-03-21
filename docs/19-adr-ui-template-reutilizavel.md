# ADR 001 - UI Reutilizável por Template

Data: 21/03/2026.
Status: aceita.

## Decisao

A partir desta data, novas telas e refactors retroativos devem seguir um template unico de interface e composicao de componentes.

Nao entra mais UI resolvida como bloco ad hoc por pagina quando o padrao ja existe ou pode ser extraido.

## Motivacao

O projeto vinha acumulando:

- filtros resolvidos de maneiras diferentes
- cards e areas de acao com estrutura variavel
- modais misturando leitura, edicao e fluxo operacional
- repeticao de estilos inline sem padrao semantico

Isso reduz previsibilidade, piora manutencao e trava a evolucao futura para phone.

## Principios

1. `busca principal` sempre visivel quando a tela for orientada a listagem
2. `filtros rapidos` em chips/segmented controls
3. `filtros avancados` em `Sheet`
4. `filtros ativos` como tags removiveis
5. `configuracao de visualizacao` separada de filtro
6. `drilldown/detalhe` em `Sheet`, nao em pagina paralela improvisada
7. `acoes operacionais` separadas de `edicao geral`
8. `cards de metricas` com estrutura consistente
9. `tabelas` dentro de card + `StickyXScroll`
10. qualquer padrao repetido em mais de uma tela deve virar componente compartilhado

## Template base por pagina

### 1. Toolbar

- titulo/descricao curta
- busca principal
- filtros rapidos
- acoes de tela

### 2. Estado ativo

- tags dos filtros ativos
- botao de limpar tudo

### 3. Conteudo principal

- tabela ou grade principal
- metrica resumida quando fizer sentido

### 4. Painel lateral

- filtros avancados
- configuracao de colunas
- detalhe contextual

## Objetos reutilizaveis atuais

Em [frontend/src/components/ui/index.jsx](/home/linuxadmin/repos/cartorio-financeiro/frontend/src/components/ui/index.jsx) e [frontend/src/components/ui/FilterControls.jsx](/home/linuxadmin/repos/cartorio-financeiro/frontend/src/components/ui/FilterControls.jsx):

- `Card`
- `Btn`
- `Badge`
- `FInput`
- `FSel`
- `StickyXScroll`
- `FilterChip`
- `ActiveFilterTag`
- `Sheet`

## Regra retroativa

Sempre que uma tela relevante for tocada para evolucao funcional:

1. primeiro verificar se o padrao ja existe
2. se existir, reaplicar
3. se nao existir, extrair o componente antes de duplicar

## Aplicacao inicial desta ADR

Esta ADR ja foi aplicada em:

- `Livros de Notas`
- `Dashboard`
- `Relatórios > Atos`
- `Relatórios > Mensal`
- `Relatórios > Comissões`

E passa a reger tambem:

- historico de taxas
- detalhe de comissoes
- proximas frentes de `P2` e `P3`
