#!/usr/bin/env bash
# Set up GCP environment for deploying a Flue agent to GEAP Agent Runtime.
#
# This script:
#   1. Enables required APIs
#   2. Creates an Artifact Registry repository for container images
#   3. Creates a service account for the agent
#   4. Grants required IAM roles
#
# Prerequisites:
#   - gcloud CLI authenticated with a project owner or editor role
#   - GCP_PROJECT_ID environment variable set
#
# Usage:
#   export GCP_PROJECT_ID=my-project
#   ./setup-gcp.sh

set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
REGION="${GCP_REGION:-us-central1}"
REPO_NAME="${ARTIFACT_REPO:-flue-agents}"
SERVICE_ACCOUNT_NAME="${AGENT_SA_NAME:-flue-agent-sa}"

echo "==> Project: ${PROJECT_ID}, Region: ${REGION}"

# ── 1. Enable required APIs ──────────────────────────────────────────────────
echo "==> Enabling required APIs..."
gcloud services enable \
  aiplatform.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  iam.googleapis.com \
  --project "${PROJECT_ID}"

# ── 2. Create Artifact Registry repository ────────────────────────────────────
echo "==> Creating Artifact Registry repository '${REPO_NAME}'..."
gcloud artifacts repositories create "${REPO_NAME}" \
  --repository-format=docker \
  --location="${REGION}" \
  --description="Flue agent container images for GEAP Agent Runtime" \
  --project="${PROJECT_ID}" \
  2>/dev/null || echo "    (repository already exists)"

# Configure Docker auth for Artifact Registry
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

# ── 3. Create service account for the agent ───────────────────────────────────
SA_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
echo "==> Creating service account '${SERVICE_ACCOUNT_NAME}'..."
gcloud iam service-accounts create "${SERVICE_ACCOUNT_NAME}" \
  --display-name="Flue Agent Service Account" \
  --project="${PROJECT_ID}" \
  2>/dev/null || echo "    (service account already exists)"

# ── 4. Grant IAM roles ───────────────────────────────────────────────────────
echo "==> Granting IAM roles to ${SA_EMAIL}..."

# Agent Runtime needs these roles on the service account
ROLES=(
  "roles/aiplatform.user"
  "roles/artifactregistry.reader"
  "roles/logging.logWriter"
  "roles/monitoring.metricWriter"
)

for ROLE in "${ROLES[@]}"; do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="${ROLE}" \
    --condition=None \
    --quiet \
    2>/dev/null || true
  echo "    Granted ${ROLE}"
done

# ── 5. Grant the GEAP tenant service account Artifact Registry access ─────────
PROJECT_NUMBER=$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')
TENANT_SA="service-${PROJECT_NUMBER}@gcp-sa-aiplatform-re.iam.gserviceaccount.com"
echo "==> Granting Artifact Registry Reader to GEAP tenant SA (${TENANT_SA})..."
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${TENANT_SA}" \
  --role="roles/artifactregistry.reader" \
  --condition=None \
  --quiet \
  2>/dev/null || echo "    (tenant SA may not exist yet — will be created on first deploy)"

# ── Summary ───────────────────────────────────────────────────────────────────
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}"
echo ""
echo "==> Setup complete!"
echo ""
echo "    Artifact Registry:  ${REGISTRY}"
echo "    Service Account:    ${SA_EMAIL}"
echo ""
echo "    Next steps:"
echo "      1. Build and push your image:  ./deploy.sh"
echo "      2. Or use Cloud Build:         gcloud builds submit --config cloudbuild.yaml"
