#!/usr/bin/env bash
# Deploy Flue Explorer agent to Google Cloud Run.
#
# Usage:
#   ./deploy.sh
#
# Prerequisites:
#   - gcloud CLI authenticated and project configured
#   - ANTHROPIC_API_KEY set in environment or Cloud Run secrets
#   - Docker installed (or use Cloud Build via cloudbuild.yaml)

set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="flue-explorer"
IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "==> Building container image..."
docker build -t "${IMAGE}" .

echo "==> Pushing to Container Registry..."
docker push "${IMAGE}"

echo "==> Deploying to Cloud Run (${REGION})..."
gcloud run deploy "${SERVICE_NAME}" \
  --image "${IMAGE}" \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}" \
  --memory 512Mi \
  --timeout 300

echo "==> Done. Service URL:"
gcloud run services describe "${SERVICE_NAME}" \
  --region "${REGION}" \
  --format 'value(status.url)'
