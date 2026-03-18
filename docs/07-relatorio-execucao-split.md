# Relatório de Execução — Split Frontend + Revisão Cruzada

Data: 18/03/2026
Autor: Claude (frontend)
Para: Codex (backend/infra) + arquivo histórico

---

## 1. Build — PASSOU ✅

```
vite v5.4.21 building for production...
✓ 50 modules transformed.
dist/assets/index-BEV-BgDM.js    84.95 kB │ gzip: 19.16 kB
dist/assets/vendor-wGySg1uH.js  140.87 kB │ gzip: 45.26 kB
dist/assets/xlsx-CkbGwgij.js    282.46 kB │ gzip: 94.92 kB
✓ built in 988ms
```

Zero erros, zero warnings de import. Os 50 módulos transformados confirmam que todos os arquivos novos estão sendo encontrados e importados corretamente.

---

## 2. Split Frontend — Concluído ✅

### Estrutura final criada

```
frontend/src/
  constants.js                              (novo)
  utils/
    format.js                               (novo)
    business.js                             (novo — temporário, ver seção 4)
    export.js                               (novo)
  components/
    ui/index.jsx                            (novo)
    modals/
      ModalAto.jsx                          (novo)
      ModalEscrevente.jsx                   (novo)
      ModalAjusteComissao.jsx               (novo)
      ModalPgtoReembolso.jsx                (novo)
      ModalDeclaroParticipacao.jsx          (novo)
      ModalRespostaCaptador.jsx             (novo)
      ModalTrocarSenha.jsx                  (novo)
  pages/
    TelaLogin.jsx                           (novo)
    Dashboard.jsx                           (novo)
    Atos.jsx                                (novo)
    Relatorios.jsx                          (novo)
    Escreventes.jsx                         (novo)
    PainelUsuarios.jsx                      (novo)
  App.jsx                                   (reescrito: 1445 → ~200 linhas)
```

### Bugs corrigidos durante o split

| # | Bug | Impacto | Correção |
|---|-----|---------|----------|
| 1 | `FORMAS_PAGAMENTO` indefinida | `ReferenceError` ao abrir ModalAto e aba Mensal | `constants.js` com a lista confirmada |
| 2 | `mesFat`/`mesRec` fixo em `'2026-01'` | Relatório Mensal sempre abria no mês errado | Inicializado com `new Date().toISOString().slice(0,7)` |
| 3 | `comInicio`/`comFim` fixo em 2026 | Filtro de comissões com ano fixo | Inicializado com `new Date().getFullYear()` |
| 4 | `id: Date.now()` em 2 modais | IDs fantasma enviados ao backend | Removido em ModalPgtoReembolso e ModalDeclaroParticipacao |

---

## 3. Revisão de Segurança — Frontend

### 3.1 Autenticação e JWT

- **JWT em localStorage**: padrão comum para SPA, mas vulnerável a XSS. Para o MVP é aceitável; em produção considerar `httpOnly` cookie + CSRF token.
- Token removido automaticamente em 401 (`api.js:15`). Correto.
- Sem credenciais hardcoded no frontend. ✅
- `VITE_API_BASE_URL` em env var, não em código. ✅

### 3.2 Controle de acesso no frontend

O frontend tem dois layers defensivos para escreventes:

1. **Backend** (C1 — `atos.js` linha 167-176): filtra atos por `captador_id` para perfil escrevente. **Fonte de verdade.**
2. **Frontend** (`podeVerAto` em `App.jsx`): segunda camada redundante mantida intencionalmente. Correto — defense in depth.

Escrevente não consegue acessar PainelUsuarios (protegido na sidebar e no routing por `userRole === 'admin'`).
Botão "Editar" em Escreventes.jsx oculto para não-admin. ✅

### 3.3 Dados sensíveis

- Nenhum dado sensível em estado global desnecessário.
- Senha nunca trafega além do formulário de troca/criação.
- `utils/business.js` não expõe lógica sensível — são apenas cálculos locais redundantes.

### 3.4 Inputs e injeção

- Todos os campos do frontend vão para a API via `JSON.stringify` + `Content-Type: application/json`. Sem concatenação de strings em queries (isso é responsabilidade do backend — confirmado com parameterized queries em todas as rotas).
- Nenhum `dangerouslySetInnerHTML`. ✅

---

## 4. Revisão Cruzada — Backend

### 4.1 C2/C3/C4 — JÁ ENTREGUES ✅

`backend/lib/finance.js` implementa `enrichAtoFinance` que acrescenta `total`, `comissoes` e `reembolso_devido_escrevente` ao payload de todo ato retornado pela API.

**Consequência imediata para o frontend:**
`utils/business.js` — funções `totalAto`, `calcularComissoes`, `reembolsoDevidoEscrevente` — são **código morto**. Os consumidores (`Dashboard.jsx`, `Relatorios.jsx`, `Atos.jsx`, etc.) podem usar diretamente `ato.total`, `ato.comissoes`, `ato.reembolso_devido_escrevente`.

**Próxima ação (Claude):** remover `utils/business.js` e atualizar todos os imports assim que Codex confirmar que o schema do banco está atualizado e o endpoint `/api/atos` já retorna os 3 campos enriquecidos em produção/staging.

### 4.2 C6 — Timestamps do servidor — PARCIALMENTE RESOLVIDO ✅⚠️

`backend/lib/audit.js` implementa:
- `resolveVerificationStamp`: usa timestamp do servidor quando `verificado_por` é definido/alterado.
- `resolveHistoricDate`: preserva data original em correções; usa data do servidor para registros novos.

**Workaround no frontend ainda ativo:** ModalAto ainda envia `verificado_em` e `data` como campos do payload. O backend os sobrescreve corretamente via audit.js — não há risco. Mas o campo pode ser removido do frontend na próxima iteração para limpeza.

### 4.3 🔴 SEGURANÇA — GET /reembolsos sem filtro por usuário

**Arquivo:** `backend/routes/reembolsos.js`

```js
router.get('/', authMiddleware, async (req, res) => {
  const { rows } = await db.query('SELECT * FROM reembolsos ...');
  res.json(rows);
});
```

Qualquer usuário autenticado (inclusive escrevente) consegue listar **todos** os reembolsos do sistema.
`PUT /:id/confirmar` já valida ownership corretamente — só o dono ou admin confirma.
**Pendência Codex:** adicionar filtro `WHERE escrevente_id = $1` para perfil `escrevente`.

### 4.4 🔴 SEGURANÇA — GET /reivindicacoes sem filtro por usuário

**Arquivo:** `backend/routes/reivindicacoes.js`

```js
router.get('/', authMiddleware, async (req, res) => {
  const { rows } = await db.query('SELECT * FROM reivindicacoes ...');
  res.json(rows);
});
```

Mesmo problema: qualquer autenticado vê todas as reivindicações de todos os escreventes.
**Pendência Codex:** mesmo tratamento — filtrar por `captador_id = req.user.escrevente_id` para perfil `escrevente`.

### 4.5 escreventes.js — PUT sem validação de taxa em não-admin

`PUT /api/escreventes/:id` permite que um escrevente (não-admin) chame o endpoint e atualize o array `compartilhar_com` do seu próprio registro. O campo `taxa` não é alterado para não-admin (linha 67–74), o que está correto.

Ponto de atenção menor: a resposta retorna `{ ...rows[0], compartilhar_com }` onde `compartilhar_com` vem do request body, não do banco. Em teoria o escrevente pode enviar um array divergente do que foi salvo se a transação tiver um rollback parcial. Não é crítico, mas o ideal seria recarregar do banco antes de responder.

### 4.6 Resto do backend — OK ✅

| Área | Status |
|------|--------|
| Rate limiting em `/auth/login` (20 req/15min) | ✅ |
| bcrypt cost factor 12 | ✅ |
| JWT verify com secret de env var | ✅ |
| CORS via env var `CORS_ORIGIN` | ✅ |
| Sem senhas hardcoded | ✅ |
| Queries parametrizadas (sem SQL injection) | ✅ |
| `usuarios.js` — tudo restrito a `admin` | ✅ |
| `escreventes.js` — GET público (só ativos) | ✅ — intencional |
| `atos.js` — filtro escrevente (C1) | ✅ |
| `audit.js` — timestamps server-side | ✅ |
| `validateRuntimeConfig` no startup | ✅ |

---

## 5. Pendências abertas

### Para Codex

| ID | Prioridade | Descrição |
|----|-----------|-----------|
| SEC-1 | 🔴 Alta | `GET /reembolsos` — adicionar filtro por escrevente para perfil `escrevente` |
| SEC-2 | 🔴 Alta | `GET /reivindicacoes` — idem |
| C2/C3/C4-CONF | 🟡 Média | Confirmar que `/api/atos` retorna `total`, `comissoes`, `reembolso_devido_escrevente` em staging — libera limpeza de `utils/business.js` |
| C6-CLEANUP | 🟢 Baixa | Confirmar que campos `verificado_em` e `data` enviados pelo frontend são ignorados/sobrescritos — libera remoção do workaround |
| ESCR-PUT | 🟢 Baixa | `PUT /escreventes/:id` — retornar `compartilhar_com` do banco em vez do body |

### Para Claude (após confirmação Codex)

| ID | Descrição |
|----|-----------|
| FE-CLEANUP-1 | Remover `utils/business.js` e substituir por `ato.total` / `ato.comissoes` / `ato.reembolso_devido_escrevente` nos consumidores |
| FE-CLEANUP-2 | Remover campos `verificado_em` e `data` do payload enviado por ModalAto |

---

## 6. Status dos Contratos (atualizado)

| Contrato | Descrição | Status |
|----------|-----------|--------|
| C1 | Escrevente só vê seus atos | ✅ Backend filtra em `atos.js:167-176` |
| C2 | `total` no payload | ✅ `enrichAtoFinance` em `lib/finance.js` |
| C3 | `comissoes` no payload | ✅ idem |
| C4 | `reembolso_devido_escrevente` no payload | ✅ idem |
| C5 | Unicidade `controle` e `livro+pagina` | ✅ Constraint + 409 em `atos.js` |
| C6 | Timestamps server-side | ✅ `audit.js` implementado; workaround frontend ainda ativo |
| C7 | IDs de pagamento gerados pelo banco | ✅ `id: Date.now()` removido dos modais |
| C8 | CORS configurável por env | ✅ `ALLOWED_ORIGINS` em `server.js` |
