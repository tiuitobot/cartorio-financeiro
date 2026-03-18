# Mock de API — Desenvolvimento Local sem Backend

Data: 18/03/2026

## O que é

Um substituto in-memory da camada `api.js` que permite rodar e navegar pelo frontend completo sem precisar do backend Node.js nem do PostgreSQL.

Ativado por variável de ambiente — zero impacto em produção.

## Arquivos

```
frontend/src/mock/
  data.js       — dados de demonstração (escreventes, atos, reembolsos, reivindicações, usuários)
  api.mock.js   — implementação mock de todos os métodos de api.js
frontend/.env.local  — ativa o mock (não commitado)
frontend/src/api.js  — exporta apiMock quando VITE_USE_MOCK=true, apiReal caso contrário
```

## Como usar

```bash
cd frontend
# .env.local já criado com VITE_USE_MOCK=true
npm run dev
# acesse http://localhost:5173
```

## Contas disponíveis

| E-mail | Perfil | Acesso |
|--------|--------|--------|
| admin@cartorio.com | Admin (Tabelião) | tudo |
| chefe@cartorio.com | Chefe Financeiro | Dashboard, Atos, Relatórios |
| financeiro@cartorio.com | Financeiro | Dashboard, Atos, Relatórios |
| joao@cartorio.com | Escrevente (João Silva) | atos onde João participa |
| maria@cartorio.com | Escrevente (Maria Santos) | atos onde Maria participa |

**Senha:** qualquer string com 6 ou mais caracteres.

## Comportamento

- Criar, editar e salvar funciona normalmente (estado in-memory).
- Estado reseta ao recarregar a página (dados voltam ao `data.js`).
- Mock simula delay de ~180ms nas chamadas para aproximar a experiência real.
- `verificado_em` é carimbado pelo mock ao salvar (simula comportamento do `audit.js`).
- `GET /reembolsos` e `GET /reivindicacoes` respeitam escopo de `escrevente`, como no backend real.
- `login` retorna o mesmo shape do backend real: `{ token, user }`.
- `GET /atos` retorna `total`, `comissoes` e `reembolso_devido_escrevente`.
- `POST/PUT /atos` aplicam validação mínima e carimbo de timestamps como o backend atual.

## Desativar

Para apontar para o backend real, remover ou comentar a linha no `.env.local`:

```env
# VITE_USE_MOCK=true
```

## Importante

- `.env.local` não deve ser commitado (já está no `.gitignore` padrão do Vite).
- O diretório `src/mock/` é código de desenvolvimento — não é importado em produção desde que `VITE_USE_MOCK` não esteja definido no ambiente de build.
