# Smoke E2E com Playwright

Data de referencia: 18/03/2026.

## Objetivo

Adicionar uma verificacao reproduzivel de ponta a ponta com:

1. PostgreSQL local real
2. backend Express real
3. frontend Vite real
4. navegacao automatizada nas telas principais

## Escopo atual

O smoke cobre dois perfis:

- `admin@cartorio.com`
- `joao@cartorio.com`

Fluxos cobertos:

- login
- dashboard
- navegacao de `Livros de Notas`
- navegacao de `Relatórios`
- navegacao de `Escreventes` e `Usuários` para admin
- restricao de menu admin para escrevente
- abertura do modal `Declaro Participação`

## Arquivos

- [playwright.config.js](/home/linuxadmin/repos/cartorio-financeiro/frontend/playwright.config.js)
- [smoke.spec.js](/home/linuxadmin/repos/cartorio-financeiro/frontend/tests/e2e/smoke.spec.js)
- [e2e-api.sh](/home/linuxadmin/repos/cartorio-financeiro/scripts/e2e-api.sh)

## Como roda

No diretório `frontend/`:

```bash
npm run e2e
```

O Playwright:

1. sobe a API com [e2e-api.sh](/home/linuxadmin/repos/cartorio-financeiro/scripts/e2e-api.sh)
2. aplica migrations
3. reaplica a seed sintética
4. sobe o frontend em `http://127.0.0.1:4173`
5. executa o smoke no Chromium

## Precondicoes

- PostgreSQL local disponivel
- `backend/.env` e `frontend/.env.local` gerados
- seed local funcional

## Observacoes

- o backend do smoke reaplica a seed antes de iniciar, para reduzir flakiness
- a suite usa `4173` fixo no frontend para nao depender de `5173` livre
- se existir Chromium do sistema em `/snap/bin/chromium`, ele sera usado
- se nao existir, o Playwright cai para o browser que estiver instalado para ele
