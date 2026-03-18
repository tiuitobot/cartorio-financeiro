#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="seu-project-id"
REGION="southamerica-east1"
SERVICE_NAME="cartorio-financeiro-api"
REPOSITORY="cartorio-financeiro"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/api:latest"
INSTANCE_CONNECTION_NAME="${PROJECT_ID}:${REGION}:cartorio-financeiro-db"
APP_BASE_URL="https://app.seudominio.com.br"

gcloud run deploy "${SERVICE_NAME}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --image "${IMAGE}" \
  --platform managed \
  --allow-unauthenticated \
  --port 3001 \
  --add-cloudsql-instances "${INSTANCE_CONNECTION_NAME}" \
  --set-env-vars "NODE_ENV=production,HOST=0.0.0.0,PORT=3001,DB_HOST=/cloudsql/${INSTANCE_CONNECTION_NAME},DB_PORT=5432,DB_NAME=cartorio,DB_USER=cartorio_user,JWT_EXPIRES_IN=8h,APP_BASE_URL=${APP_BASE_URL},CORS_ORIGIN=${APP_BASE_URL}" \
  --set-secrets "DB_PASSWORD=cartorio-db-password:latest,JWT_SECRET=cartorio-jwt-secret:latest"
