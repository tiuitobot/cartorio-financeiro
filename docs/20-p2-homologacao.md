# P2 em Homologacao

Data de referencia: 21/03/2026.

Ambiente:

- homolog: `https://cartorio-web-homolog-production.up.railway.app`

## Escopo do P2 validado em homologacao

Itens do backlog cobertos nesta fase:

- `3.4` multiplos pagamentos por ato
- `3.6` status controlado pela confirmacao do financeiro
- `3.8 fase 1` historico automatico por diff
- `9.2` historico de taxas com vigencia
- `6.2` visao detalhada de comissoes por escrevente

## O que esta implementado

### Backend

- `pagamentos_ato` como base oficial de lancamentos
- separacao entre:
  - `valor_pago_lancado`
  - `valor_pago_confirmado`
  - `status_calculado`
  - `status`
- conferencia financeira por pagamento
- diff automatico append-only em `correcoes`
- `escreventes_taxas_historico` com vigencia
- baseline historica em `1900-01-01` para novos escreventes
- migration de saneamento para escreventes sem baseline historica
- consulta de atos calculando comissao pela taxa vigente na data do ato

### Frontend

- modal de ato com bloco `Lançamentos e Conferência Financeira`
- modo dedicado de conferencia a partir de `Livros de Notas`
- coluna financeira separando `Lan` e `Conf`
- badges:
  - `✅ Conferido`
  - `💼 Conferir`
  - `➖ Sem pgto a conferir`
- modal de escrevente mostrando:
  - vigencia da taxa
  - historico de taxas
- `Relatórios > Comissões` com detalhe lateral por escrevente e por ato

## Validacao executada

### Local

- `cd backend && npm test`
- `cd frontend && npm run build`
- `cd frontend && CI=1 npm run e2e`

### Homologacao

Foi validado com browser e API:

1. `Livros de Notas`
   - filtros/colunas em sheets
   - badge e coluna financeira coerentes para atos sem pagamento e com pagamento pendente
   - entrada dedicada para conferencia financeira

2. `Escreventes`
   - criacao de historico de taxa
   - exibicao de vigencia e historico no modal

3. `Relatórios > Comissões`
   - total por escrevente
   - drilldown lateral por ato
   - percentual e valor refletindo a taxa historica vigente na data do ato

4. `Backend`
   - login e listagens
   - criacao de escrevente com historico
   - alteracao de taxa com vigencia
   - calculo historico corrigido para atos anteriores e posteriores a mudanca

## Correcoes desta rodada

Bug resolvido:

- a primeira linha do historico de taxa estava nascendo com vigencia em `hoje`, o que fazia atos anteriores cair no fallback da taxa atual

Correcao aplicada:

- baseline historica passou a nascer em `1900-01-01`
- migration retroativa criou baseline para escreventes sem essa linha
- leitura historica passou a degradar para a linha historica mais antiga conhecida, e nao para a taxa atual cadastrada

## Estado de release

- implementado e validado na homologacao
- ainda nao promovido para producao nesta rodada
