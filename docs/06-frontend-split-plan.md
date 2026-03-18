# Plano de Split do Frontend

Data de referência: 18/03/2026.

## Contexto

O arquivo `frontend/src/App.jsx` tem 1445 linhas e concentra tudo:
helpers, regras de negócio, primitivos de UI, modais, páginas e estado global.

O objetivo deste plano é separar em módulos coesos sem alterar comportamento — apenas mover código, ajustar imports e corrigir os bugs identificados durante a leitura.

---

## Bugs a corrigir durante o split

### Bug 1 — `FORMAS_PAGAMENTO` indefinida (crítico)

Referenciada nas linhas 278 e 734 mas nunca definida no arquivo.
Causa `ReferenceError` ao abrir `ModalAto` e ao acessar a aba "Mensal" em Relatórios.

Correção: definir a constante em `src/constants.js`.

```js
export const FORMAS_PAGAMENTO = [
  'Dinheiro', 'PIX', 'Cartão de crédito', 'Cartão de débito',
  'Transferência', 'Cheque', 'Outro'
];
```

> **Atenção Codex:** confirmar se a lista correta está no backend ou no schema.
> Se vier do backend, trocar por endpoint ou campo fixo do sistema.

### Bug 2 — Mês padrão hardcoded em Relatórios

Linhas 594–597: `mesFat`, `mesRec` iniciam como `'2026-01'` e `comInicio`/`comFim` como datas fixas de 2026.

Correção no split:
```js
const hoje = new Date();
const mesAtual = hoje.toISOString().slice(0, 7);          // '2026-03'
const anoInicio = `${hoje.getFullYear()}-01-01`;
const anoFim    = `${hoje.getFullYear()}-12-31`;
```

### Bug 3 — IDs locais com `Date.now()`

`ModalDeclaroParticipacao` (linha 910) e `ModalPgtoReembolso` (linha 471) criam objetos com `id: Date.now()` antes de enviar para a API. Isso causa:
- a guarda `form.id < 1e12` no `salvarAto` para distinguir IDs reais de timestamps
- risco de colisão e confusão na lógica de update/create

Correção: remover `id` dos objetos montados no frontend antes do envio. O ID deve vir do backend após o POST.

---

## Estrutura alvo

```
frontend/src/
  constants.js                      ← FORMAS_PAGAMENTO e outras constantes globais
  api.js                            ← já existe, sem alteração
  utils/
    format.js                       ← formatação pura (sem side-effects)
    business.js                     ← regras de negócio (temporariamente no frontend)
    export.js                       ← exportXLSX + ALL_COLS
  components/
    ui/
      index.jsx                     ← Badge, Card, FInput, FSel, Btn, ST, CurrencyInput
    modals/
      ModalEscrevente.jsx
      ModalAjusteComissao.jsx
      ModalAto.jsx
      ModalPgtoReembolso.jsx
      ModalDeclaroParticipacao.jsx
      ModalRespostaCaptador.jsx
      ModalTrocarSenha.jsx
  pages/
    TelaLogin.jsx
    Dashboard.jsx
    Atos.jsx                        ← tabela de atos + painéis de reivindicação
    Relatorios.jsx
    Escreventes.jsx
    PainelUsuarios.jsx
  App.jsx                           ← só estado, carregamento, roteamento, render principal
```

---

## Conteúdo de cada arquivo

### `src/constants.js`

- `FORMAS_PAGAMENTO`

### `src/utils/format.js`

Funções de formatação pura sem regra de negócio:

- `padControle`
- `fmtLivro`
- `fmtPagina`
- `fmtRef`
- `fmt` (moeda)
- `fmtDate`
- `sLabel`
- `sColor`

### `src/utils/business.js`

Regras de negócio atualmente no frontend.
**Atenção:** marcadas como temporárias — devem migrar para o backend no médio prazo.

- `totalAto` — soma dos campos financeiros do ato
- `calcularComissoes` — lógica de comissão por taxa (6%, 20%, 30%)
- `reembolsoDevidoEscrevente` — reembolso líquido considerando prioridade de pagamento
- `parseRef` — parse de referência no formato L00P000

### `src/utils/export.js`

- `exportXLSX` — exportação com fallback para CSV
- `ALL_COLS` — definição das colunas configuráveis da tabela de atos

### `src/components/ui/index.jsx`

Primitivos de UI sem estado de domínio:

- `Badge`
- `Card`
- `FInput`
- `FSel`
- `Btn`
- `ST` (section title)
- `CurrencyInput`

### `src/components/modals/ModalEscrevente.jsx`

Props: `{ init, onClose, onSave, todosEscreventes }`

### `src/components/modals/ModalAjusteComissao.jsx`

Props: `{ ato, escreventes, onClose, onSave }`
Depende de: `calcularComissoes` (business.js)

### `src/components/modals/ModalAto.jsx`

Props: `{ ato, onClose, onSave, escreventes, userRole, userId }`
Depende de: `calcularComissoes`, `reembolsoDevidoEscrevente`, `totalAto` (business.js), `FORMAS_PAGAMENTO` (constants.js)

### `src/components/modals/ModalPgtoReembolso.jsx`

Props: `{ escrevente, onClose, onSave }`
Fix incluído: remover `id: Date.now()` do objeto enviado.

### `src/components/modals/ModalDeclaroParticipacao.jsx`

Props: `{ userId, atos, escreventes, onClose, onSubmit }`
Fix incluído: remover `id: Date.now()` do objeto enviado.

### `src/components/modals/ModalRespostaCaptador.jsx`

Props: `{ reiv, escreventes, onClose, onSave }`

### `src/components/modals/ModalTrocarSenha.jsx`

Props: `{ onClose }`
Depende de: `api.trocarSenha`

### `src/pages/TelaLogin.jsx`

Props: `{ onLogin }`
Depende de: `api.login`

### `src/pages/Dashboard.jsx`

Props: `{ atos, escreventes }`
Depende de: `totalAto`, `calcularComissoes` (business.js)

### `src/pages/Atos.jsx`

Props: `{ atos, escreventes, reivindicacoes, userRole, userId, onOpenAto, onDeclaro, onRespostaCaptador, onContestar, onDecisaoFinanceiro, busca, onBusca }`

Contém:
- painéis de reivindicação pendente / recusada / contestada
- barra de busca
- tabela de atos

### `src/pages/Relatorios.jsx`

Props: `{ atos, escreventes, pagamentosReembolso, onAddPagamento, onConfirmarReembolso }`

Abas internas:
- Atos (filtros + exportação)
- Mensal (faturamento + recebimentos)
- Comissões
- Reembolsos

Fix incluído: `mesFat`, `mesRec`, `comInicio`, `comFim` inicializados com mês/ano corrente.

### `src/pages/Escreventes.jsx`

Props: `{ escreventes, atos, userRole, onEditar }`

### `src/pages/PainelUsuarios.jsx`

Props: `{ escreventes }`
Possui estado local próprio (lista de usuários, modal de criação/edição).

### `src/App.jsx` (resultado final)

Responsabilidades:
- estado global: `user`, `atos`, `escreventes`, `pagamentosReembolso`, `reivindicacoes`
- verificação de autenticação ao iniciar
- carregamento de dados (`carregarDados`)
- handlers: `salvarAto`, `salvarEscrevente`, `handleDeclaro`, `handleRespostaCaptador`, `handleContestarRecusa`, `handleDecisaoFinanceiro`, `handleLogin`, `handleLogout`
- roteamento por `view`
- sidebar + header
- renderização das páginas e modais

---

## Contratos com o backend (para Codex)

Consolidação de todas as questões levantadas durante a leitura do frontend.
Cada item bloqueia ou condiciona uma decisão de implementação no split.

---

### C1 — Filtro de visibilidade de atos

**Situação atual:** `podeVerAto` (App.jsx linha 1156) filtra no cliente quais atos o escrevente pode ver, baseado em `captador_id`, `executor_id`, `signatario_id` e `compartilhar_com`.

**Problema:** o frontend recebe todos os atos e filtra localmente. Um escrevente autenticado consegue ver dados de atos que não deveria se inspecionar a resposta da API.

**Pergunta:** `GET /atos` já filtra por perfil no backend, ou retorna tudo e delega ao frontend?

**Impacto no frontend:** se o backend filtrar, `podeVerAto` pode ser removido do frontend. Se não, fica em `utils/business.js` como workaround com comentário de dívida técnica.

---

### C2 — `totalAto` calculado pelo backend

**Situação atual:** `totalAto` (linha 12) é calculado no frontend como:
```
emolumentos + repasses + issqn + reembolso_tabeliao + reembolso_escrevente
```
É usado em pelo menos 15 pontos do código (Dashboard, Relatórios, tabelas, modais).

**Pedido:** o backend deve retornar o campo `total` já calculado no payload de cada ato.

**Impacto:** se vier do backend, `totalAto` vira só um fallback de segurança ou é removido.

---

### C3 — `calcularComissoes` no backend

**Situação atual:** a lógica de comissão (linhas 24–52) está inteira no frontend:
- taxa 30%: captador leva 24% ou 30% dependendo de executor; signatário ganha R$20 fixo
- taxa 20%: captador leva 20%; mesmas regras de executor e signatário
- taxa 6%: todos levam 6%; signatário R$20 fixo
- suporte a `comissao_override` para ajuste manual

**Problema:** regra de negócio financeira exposta e duplicável pelo cliente.

**Pedido:** o backend deve retornar `comissoes` calculadas no payload do ato. Formato esperado:
```json
"comissoes": [
  { "escrevente_id": 3, "papel": "Captador", "pct": 24, "total": 120.00 },
  { "escrevente_id": 5, "papel": "Executor", "pct": 6,  "total": 30.00 }
]
```

**Impacto no frontend:** enquanto o backend não retornar isso, `calcularComissoes` fica em `utils/business.js` marcada como temporária. Quando vier do backend, o frontend apenas lê `ato.comissoes`.

---

### C4 — `reembolsoDevidoEscrevente` no backend

**Situação atual:** cálculo na linha 55:
```
sobra = valor_pago - (emolumentos + repasses + issqn + reembolso_tabeliao)
reembolso_devido = min(sobra, reembolso_escrevente)  [se sobra > 0]
```

**Pedido:** retornar `reembolso_devido_escrevente` calculado no payload do ato. Mesma lógica de C2 e C3 — o frontend não deveria fazer esse cálculo.

---

### C5 — `FORMAS_PAGAMENTO`

**Situação atual:** constante usada em dois pontos do código (linhas 278 e 734) mas **nunca definida** — bug ativo que causa crash ao abrir `ModalAto` e ao acessar a aba "Mensal" em Relatórios.

**Pergunta:** a lista de formas de pagamento é fixa ou configurável?

- Se fixa: confirmar a lista correta para definir em `src/constants.js`
- Se configurável: precisamos de `GET /formas-pagamento` ou campo equivalente

**Sugestão de lista padrão** (confirmar ou corrigir):
```
Dinheiro, PIX, Cartão de crédito, Cartão de débito, Transferência, Cheque, Outro
```

---

### C6 — Timestamps de servidor vs. cliente

**Situação atual:**

- `confirmarRecebimento` (linha 267): usa `new Date().toLocaleDateString('pt-BR')` — data do navegador do usuário
- `addCorrecao` (linha 272): mesma coisa — cria `{ data: new Date().toLocaleDateString('pt-BR') }`
- `ModalDeclaroParticipacao` (linha 910): cria reivindicação com `data: new Date().toLocaleDateString('pt-BR')`

**Problema:** datas controladas pelo cliente são falsificáveis e dependentes do fuso do navegador.

**Pedido:** os endpoints que recebem essas ações devem registrar o timestamp no servidor e retorná-lo na resposta. O frontend deve parar de enviar `data` e `verificado_em` — esses campos devem vir do backend.

---

### C7 — IDs locais com `Date.now()`

**Situação atual:**

- `ModalPgtoReembolso` (linha 471): envia `{ id: Date.now(), ... }` ao criar pagamento de reembolso
- `ModalDeclaroParticipacao` (linha 910): envia `{ id: Date.now(), ... }` ao criar reivindicação

O `salvarAto` tem uma guarda `form.id < 1e12` para distinguir IDs reais de timestamps — gambiarra pra compensar isso.

**Pedido:** confirmar que os endpoints `POST /reembolsos` e `POST /reivindicacoes` retornam o objeto criado com o `id` real do banco. O frontend vai parar de gerar IDs locais.

---

### C8 — Autorização de `chefe_financeiro`

**Situação atual:** o perfil `chefe_financeiro` foi corrigido no frontend (doc 05 cita "correção simples de permissão"), mas a correção foi só no frontend.

**Pergunta:** o backend já trata `chefe_financeiro` com as mesmas permissões que `financeiro` nos endpoints sensíveis? Ou ainda precisa de ajuste?

---

### Status dos contratos (atualizado 18/03/2026)

| # | Contrato | Status | Ação no frontend |
|---|---|---|---|
| C1 | Filtro de atos por perfil | ✅ Backend já filtra para escrevente (`routes/atos.js:40`) | `podeVerAto` redundante para escrevente; manter por ora, remover depois |
| C2 | `total` no payload | 🔄 Codex adiciona de forma aditiva (`lib/finance.js:20`) | `totalAto` fica em `utils/business.js`; quando chegar vira fallback e some |
| C3 | `comissoes` no payload | 🔄 Codex adiciona de forma aditiva (`lib/finance.js:44`) | `calcularComissoes` fica em `utils/business.js`; quando chegar frontend só lê `ato.comissoes` |
| C4 | `reembolso_devido_escrevente` no payload | 🔄 Codex adiciona de forma aditiva (`lib/finance.js:28`) | `reembolsoDevidoEscrevente` fica em `utils/business.js` |
| C5 | `FORMAS_PAGAMENTO` | ✅ Lista fixa confirmada | Definir em `src/constants.js` agora — desbloqueia o split |
| C6 | Timestamps de servidor | ⏳ Codex trata depois (backward-compatible) | Frontend mantém workaround; quando Codex migrar, frontend para de enviar os campos |
| C7 | IDs do banco no POST | ✅ Ambos os POSTs retornam ID real (`reembolsos.js:21`, `reivindicacoes.js:28`) | Remover `id: Date.now()` de `ModalPgtoReembolso` e `ModalDeclaroParticipacao` |
| C8 | Permissão `chefe_financeiro` | ✅ Já tratado no backend (`atos.js:77,105`, `reembolsos.js:17,35`, `reivindicacoes.js:52,64`) | Nenhuma ação necessária |

### Lista confirmada para C5

```js
export const FORMAS_PAGAMENTO = [
  'Dinheiro',
  'PIX',
  'Cartão de crédito',
  'Cartão de débito',
  'Transferência',
  'Cheque',
  'Outro',
];
```

---

## Ordem de execução do split

1. Criar `constants.js` com `FORMAS_PAGAMENTO` — corrige bug crítico imediatamente
2. Criar `utils/format.js`, `utils/business.js`, `utils/export.js`
3. Criar `components/ui/index.jsx`
4. Criar modais (mais fáceis — sem estado externo)
5. Criar páginas (dependem de modais e utils)
6. Reescrever `App.jsx` usando os novos imports

Cada etapa é um commit separado. O comportamento deve ser idêntico ao original a cada passo.

---

## O que este split NÃO faz

- Não altera regras de negócio
- Não muda a API
- Não introduz React Router (navegação continua por `view` state)
- Não introduz gerenciador de estado externo
- Não adiciona testes (etapa futura)
