# Preparacao para Google Cloud

Destino alvo:

- API em Cloud Run
- banco em Cloud SQL for PostgreSQL
- segredos em Secret Manager
- regiao `southamerica-east1`

## Arquivos deste diretorio

- `cloudrun-deploy.example.sh`: exemplo de deploy da API em Cloud Run

## Premissas

- o mesmo `Dockerfile` da raiz deve ser reutilizado
- o banco deve continuar sendo PostgreSQL puro
- a aplicacao deve continuar operando por variaveis de ambiente

## Antes da migracao

1. versionar migracoes do banco
2. revisar seguranca e permissao por perfil
3. validar restore de dump em um banco novo
4. separar ambientes de homologacao e producao
