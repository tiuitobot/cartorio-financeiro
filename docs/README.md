# Cartorio Financeiro - Documentacao Tecnica

Documentacao do projeto: hospedagem, onboarding, backlog, incidentes de deploy, planos de implementacao e ADRs.

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

- [16-avaliacao-especificacao-v2.md](/home/linuxadmin/repos/cartorio-financeiro/docs/16-avaliacao-especificacao-v2.md)
  Avaliacao item a item das novas recomendacoes do Henrique na especificacao v2, separando o que entra como melhoria simples do que exige redesign de dominio.

- [17-backlog-especificacao-v2.md](/home/linuxadmin/repos/cartorio-financeiro/docs/17-backlog-especificacao-v2.md)
  Backlog priorizado em `P1`, `P2` e `P3`, com impacto tecnico, dependencias e ordem recomendada de implementacao.

- [18-checkpoint-financeiro-legado.md](/home/linuxadmin/repos/cartorio-financeiro/docs/18-checkpoint-financeiro-legado.md)
  Checkpoint da frente financeira em homologacao, com diagnostico do legado de pagamentos, migration de saneamento e validacao dos casos `00286` e `00999`.

- [19-adr-ui-template-reutilizavel.md](/home/linuxadmin/repos/cartorio-financeiro/docs/19-adr-ui-template-reutilizavel.md)
  ADR que formaliza o template unico de UI e a obrigatoriedade de extrair componentes/padroes reutilizaveis para novas telas e refactors retroativos.

- [19-frontend-architecture-next.md](/home/linuxadmin/repos/cartorio-financeiro/docs/19-frontend-architecture-next.md)
  Preparacao arquitetural do frontend para escala: multi-tenancy, React Router, Tailwind, paginacao backend e code splitting.

- [20-p2-homologacao.md](/home/linuxadmin/repos/cartorio-financeiro/docs/20-p2-homologacao.md)
  Estado do `P2` validado na homologacao, com escopo coberto, correcao de historico de taxas e resultado da validacao de backend e UI.

- [21-pendencias-producao.md](/home/linuxadmin/repos/cartorio-financeiro/docs/21-pendencias-producao.md)
  Checkpoint da promocao do modulo de pendencias para producao, com regra final de reabertura, atalho de conferencia e validacao funcional.

- [22-deploy-incidents-2026-03-23.md](/home/linuxadmin/repos/cartorio-financeiro/docs/22-deploy-incidents-2026-03-23.md)
  Registro dos incidentes de deploy no Railway em 23/03/2026, incluindo deploy acidental como site estatico, timeout de healthcheck e migrations com constraint.

- [23-plano-implantacao-p3-henrique.md](/home/linuxadmin/repos/cartorio-financeiro/docs/23-plano-implantacao-p3-henrique.md)
  Plano operacional de implantacao das 6 etapas do P3 restante (despesas_registro, auxiliar_registro, column persistence, financial alerts), concluido em 24/03/2026.

## Resumo executivo

- Curto prazo: subir o MVP no Railway para validar operacao com o cartorio.
- Antes do Railway: validar localmente com PostgreSQL nativo e API real.
- Medio prazo: manter o codigo portavel, com banco PostgreSQL, variaveis de ambiente padronizadas e deploy via container.
- Longo prazo: migrar API para Cloud Run e banco para Cloud SQL em Sao Paulo.
