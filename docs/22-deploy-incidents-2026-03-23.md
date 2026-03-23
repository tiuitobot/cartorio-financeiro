# Incidentes de Deploy — 23/03/2026

Registro dos problemas encontrados ao aplicar os fixes do Henrique e subir no homolog Railway.

## Incidente 1: Deploy acidental do frontend como site estático Caddy

**O que aconteceu:** `railway up --ci` foi executado do diretório `frontend/` em vez do root do projeto. O Railway auto-detectou como "vite static site" e deployou com Caddy em vez de usar o Dockerfile.

**Consequência:** O backend Express sumiu. `/api/auth/login` retornava `405 Method Not Allowed` (Caddy só aceita GET/HEAD). O frontend carregava mas não conseguia fazer login.

**Diagnóstico:** Os logs do Railway mostravam `caddy run` em vez de `node`. O `curl /api/health` retornava HTML (a SPA) em vez de JSON.

**Solução:** Redeployar do diretório raiz (`cd /home/linuxadmin/repos/cartorio-financeiro && railway up --ci`).

**Prevenção:**
- **SEMPRE** executar `railway up` do root do projeto, nunca de um subdiretório
- Verificar nos logs de build se aparece `Using Detected Dockerfile` e não `Deploying as vite static site`
- Após deploy, checar `curl /api/health` — se retornar HTML em vez de JSON, o backend não está rodando

## Incidente 2: Healthcheck timeout impedia deploys válidos

**O que aconteceu:** O container Docker leva tempo para iniciar (boot Node, migrations SQL, warm-up). O healthcheck do Railway tem janela de 5 minutos. O container ficava pronto em ~5-7 min, causando falha do healthcheck mesmo com o serviço saudável.

**Consequência:** `railway up --ci` retornava "Deploy failed" mas o serviço estava respondendo OK. Com o incidente 1 ativo, o Railway fazia rollback para o deploy Caddy anterior, criando um loop onde era impossível substituir o deploy Caddy por um deploy Dockerfile.

**Diagnóstico:** O healthcheck falhava em todas as tentativas, mas `curl /api/health` retornava 200 momentos depois.

**Solução:**
1. Aumentar `healthcheckTimeout` para 600s no `railway.json`
2. Temporariamente remover `healthcheckPath` para forçar o deploy a completar
3. Restaurar `healthcheckPath` após o deploy estabilizar

**Prevenção:**
- Manter `healthcheckTimeout: 600` no `railway.json`
- Se o healthcheck falhar mas o `curl` funcionar, remover temporariamente o `healthcheckPath`, deployar, e restaurar depois

## Incidente 3: Migration falhava por dados legados incompatíveis

**O que aconteceu:** A migration 0014 adicionava um CHECK constraint em `tipo_ato` limitando a 6 valores canônicos (`escritura`, `ata`, `testamento`, `procuracao`, `certidao`, `apostila`). O banco de homologação tinha 38 variações de digitação livre (ex: `ESCRTURA`, `DELARATÓRIA`, `ATA NOTARIAL`, `CERTDAO EM GERAL`, etc.).

**Consequência:** O container reiniciava em loop — cada boot tentava aplicar a migration, falhava no constraint, e o script de migrations abortava. O backend nunca subia.

**Diagnóstico:** `railway logs` mostrava: `✗ falha ao aplicar migrations: check constraint "chk_atos_tipo_ato" of relation "atos" is violated by some row`.

**Solução:** Adicionar normalização de dados **antes** do constraint na migration:
```sql
UPDATE atos SET tipo_ato = 'escritura' WHERE lower(tipo_ato) LIKE '%escritura%' OR lower(tipo_ato) LIKE '%escrtura%';
UPDATE atos SET tipo_ato = 'ata' WHERE lower(tipo_ato) LIKE '%ata%notarial%' OR lower(tipo_ato) LIKE '%ata%de%usucapi%';
-- etc.
UPDATE atos SET tipo_ato = NULL WHERE tipo_ato NOT IN (...valores canônicos...);
```

**Prevenção:**
- **SEMPRE** verificar dados existentes antes de adicionar CHECK constraints: `SELECT DISTINCT coluna FROM tabela WHERE coluna IS NOT NULL`
- Migrations que adicionam constraints em colunas com dados legados devem incluir um passo de normalização antes do `ALTER TABLE`
- Testar migrations contra o banco de homolog (via `DATABASE_PUBLIC_URL`) antes de deployar

## Incidente 4: Senha de admin inválida no homolog

**O que aconteceu:** O seed original usava `CartorioDev123` como senha padrão, mas a base de homolog já tinha sido re-seeded com dados de produção (pelo Henrique ou por um seed anterior). O admin `admin@cartorio.com` existia com outra senha.

**Solução:** Usar `create-admin.js` com a `DATABASE_PUBLIC_URL` do Postgres público:
```bash
DB_PUBLIC_URL=$(railway variables --json | python3 -c "import sys,json; print(json.load(sys.stdin)['DATABASE_PUBLIC_URL'])")
DATABASE_URL="$DB_PUBLIC_URL" ADMIN_NAME="Admin Homolog" ADMIN_EMAIL="admin@cartorio.com" ADMIN_PASSWORD="CartorioDev123" node backend/scripts/create-admin.js
```

**Prevenção:**
- `railway run` não funciona para scripts que acessam banco porque `postgres.railway.internal` só resolve dentro da rede Railway
- Para acessar o banco de fora, usar a `DATABASE_PUBLIC_URL` do serviço Postgres (disponível via `railway variables --json` linkado ao serviço Postgres)
- Documentar que `create-admin.js` faz upsert (`ON CONFLICT DO UPDATE`), então é seguro rodar múltiplas vezes

## Incidente 5: Numeração errada de migration nos diffs do Henrique

**O que aconteceu:** O diff `fix-04` nomeava a migration como `0005_taxa_zero_e_tipo_ato.sql`, mas já existiam migrations 0001–0013 no projeto.

**Consequência:** Se aplicado como-está, criaria uma migration fora de ordem que poderia não executar ou conflitar.

**Solução:** Renumerar para `0014_taxa_zero_e_tipo_ato.sql`.

**Prevenção:**
- Antes de aplicar diffs externos, verificar a última migration existente: `ls backend/db/migrations/ | tail -1`
- Comunicar ao autor dos diffs qual é a numeração atual

## Checklist de deploy para homolog

Para evitar recorrência:

```
1. [ ] Estou no diretório ROOT do projeto (não em frontend/ ou backend/)
2. [ ] `railway status` mostra o serviço correto (cartorio-web-homolog, não Postgres)
3. [ ] Testes locais passam: `node --test tests/*.test.js` e `npx vite build`
4. [ ] Migrations testadas contra dados existentes (verificar dados antes de ADD CONSTRAINT)
5. [ ] `railway up --ci`
6. [ ] Verificar nos logs: "Using Detected Dockerfile" (não "vite static site")
7. [ ] Esperar container subir e verificar: `curl /api/health` retorna JSON (não HTML)
8. [ ] Se healthcheck falhou mas curl funciona: remover healthcheckPath, redeployar, restaurar
9. [ ] Relinkar para produção: `railway link -p secure-recreation -s amiable-perfection -e production`
```
