# Cartorio Financeiro - Docs de Hospedagem

Documentos gerados em 18/03/2026 para orientar a hospedagem inicial do sistema e a migracao posterior para Google Cloud.

## Arquivos

- [01-visao-executiva-hospedagem.md](/home/linuxadmin/repos/cartorio-financeiro/docs/01-visao-executiva-hospedagem.md)
  Comparativo entre Railway, Supabase e Google Cloud, com recomendacao e estimativas iniciais de custo.

- [02-mvp-railway-runbook.md](/home/linuxadmin/repos/cartorio-financeiro/docs/02-mvp-railway-runbook.md)
  Guia pratico para subir o MVP no Railway agora, sem comprometer a migracao futura.

- [03-migracao-google-cloud.md](/home/linuxadmin/repos/cartorio-financeiro/docs/03-migracao-google-cloud.md)
  Plano de migracao do MVP para Google Cloud quando o sistema sair da fase inicial.

- [04-onboarding-tecnico.md](/home/linuxadmin/repos/cartorio-financeiro/docs/04-onboarding-tecnico.md)
  Guia para uma pessoa nova entender o projeto, preparar ambiente e operar a base atual.

- [05-handoff-status-atual.md](/home/linuxadmin/repos/cartorio-financeiro/docs/05-handoff-status-atual.md)
  Registro do estado atual do repositório, decisões tomadas, pendências e próximos passos.

- [06-frontend-split-plan.md](/home/linuxadmin/repos/cartorio-financeiro/docs/06-frontend-split-plan.md)
  Plano de modularização do frontend, bugs identificados e contratos de API levantados durante o split.

- [07-relatorio-execucao-split.md](/home/linuxadmin/repos/cartorio-financeiro/docs/07-relatorio-execucao-split.md)
  Relatório do Claude com resultado do split do frontend, build e revisão cruzada inicial do backend.

- [07-frontend-timestamp-cleanup-checklist.md](/home/linuxadmin/repos/cartorio-financeiro/docs/07-frontend-timestamp-cleanup-checklist.md)
  Checklist curto para o frontend parar de enviar campos de timestamp que agora sao carimbados pelo backend. **CONCLUÍDO.**

- [08-mock-api.md](/home/linuxadmin/repos/cartorio-financeiro/docs/08-mock-api.md)
  Como rodar o frontend localmente sem backend usando o mock de API.

- [09-infra-local-postgres.md](/home/linuxadmin/repos/cartorio-financeiro/docs/09-infra-local-postgres.md)
  Runbook do ambiente local com PostgreSQL nativo, scripts de bootstrap e smoke test.

- [10-e2e-playwright.md](/home/linuxadmin/repos/cartorio-financeiro/docs/10-e2e-playwright.md)
  Smoke E2E reproduzível com Playwright usando frontend, backend e banco reais.

- [11-ci-github-actions.md](/home/linuxadmin/repos/cartorio-financeiro/docs/11-ci-github-actions.md)
  Pipeline de CI com GitHub Actions para testes de backend, build do frontend e smoke E2E.

- [12-railway-primeiro-deploy.md](/home/linuxadmin/repos/cartorio-financeiro/docs/12-railway-primeiro-deploy.md)
  Runbook do primeiro deploy no Railway com migrations no boot e criação manual do admin.

- [13-importacao-controle-diario.md](/home/linuxadmin/repos/cartorio-financeiro/docs/13-importacao-controle-diario.md)
  Estado atual da importacao da planilha do cartorio, staging implementado e pendencias de dominio para a importacao definitiva.

- [14-railway-homologacao.md](/home/linuxadmin/repos/cartorio-financeiro/docs/14-railway-homologacao.md)
  Ambiente publico e isolado de homologacao no Railway, com URL, credenciais seeded e operacao basica.

- [15-lote-homologacao-controlado.md](/home/linuxadmin/repos/cartorio-financeiro/docs/15-lote-homologacao-controlado.md)
  Lote `.xlsx` controlado para testar upload, preview e importacao sem depender da planilha real do cartorio.

## Resumo executivo

- Curto prazo: subir o MVP no Railway para validar operacao com o cartorio.
- Antes do Railway: validar localmente com PostgreSQL nativo e API real.
- Medio prazo: manter o codigo portavel, com banco PostgreSQL, variaveis de ambiente padronizadas e deploy via container.
- Longo prazo: migrar API para Cloud Run e banco para Cloud SQL em Sao Paulo.
