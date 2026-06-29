#!/usr/bin/env bash
# Deploy Flue Explorer agent to GEAP Agent Runtime.
#
# This script:
#   1. Builds and pushes the container image to Artifact Registry
#   2. Deploys (or updates) the agent on GEAP Agent Runtime via REST API
#
# Prerequisites:
#   - GCP environment set up (run setup-gcp.sh first)
#   - gcloud CLI authenticated
#   - ANTHROPIC_API_KEY set in environment
#   - Docker installed
#
# Usage:
#   export GCP_PROJECT_ID=my-project
#   export ANTHROPIC_API_KEY=sk-ant-...
#   ./deploy.sh

set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
REGION="${GCP_REGION:-us-central1}"
REPO_NAME="${ARTIFACT_REPO:-flue-agents}"
AGENT_NAME="${AGENT_NAME:-flue-explorer}"
SERVICE_ACCOUNT_NAME="${AGENT_SA_NAME:-flue-agent-sa}"
SA_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}"
IMAGE="${REGISTRY}/${AGENT_NAME}"
TAG="$(date +%Y%m%d-%H%M%S)"
IMAGE_URI="${IMAGE}:${TAG}"

API_ENDPOINT="https://${REGION}-aiplatform.googleapis.com/v1"
PARENT="projects/${PROJECT_ID}/locations/${REGION}"

# ── 1. Build container image ─────────────────────────────────────────────────
echo "==> Building container image..."
docker build -t "${IMAGE_URI}" -t "${IMAGE}:latest" .

# ── 2. Push to Artifact Registry ─────────────────────────────────────────────
echo "==> Pushing to Artifact Registry..."
docker push "${IMAGE_URI}"
docker push "${IMAGE}:latest"

# ── 3. Deploy to GEAP Agent Runtime ──────────────────────────────────────────
echo "==> Deploying to GEAP Agent Runtime..."

ACCESS_TOKEN=$(gcloud auth print-access-token)

# Check if agent already exists
EXISTING=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  "${API_ENDPOINT}/${PARENT}/reasoningEngines?filter=display_name=${AGENT_NAME}" \
)

# Build the deployment request body
REQUEST_BODY=$(cat <<EOF
{
  "displayName": "${AGENT_NAME}",
  "spec": {
    "containerSpec": {
      "imageUri": "${IMAGE_URI}",
      "env": [
        {
          "name": "ANTHROPIC_API_KEY",
          "value": "${ANTHROPIC_API_KEY:?Set ANTHROPIC_API_KEY}"
        },
        {
          "name": "PORT",
          "value": "8080"
        },
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ]
    },
    "classMethodSpecs": [
      {
        "methodName": "query",
        "methodInput": {
          "type": "object",
          "properties": {
            "prompt": {
              "type": "string",
              "description": "The user prompt to send to the agent"
            },
            "session_id": {
              "type": "string",
              "description": "Optional session ID for conversation continuity"
            }
          },
          "required": ["prompt"]
        }
      }
    ]
  },
  "serviceAccountName": "${SA_EMAIL}"
}
EOF
)

echo "==> Creating agent engine..."
RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "${REQUEST_BODY}" \
  "${API_ENDPOINT}/${PARENT}/reasoningEngines" \
)

# Check if it's a long-running operation
OPERATION_NAME=$(echo "${RESPONSE}" | grep -o '"name": *"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "${OPERATION_NAME}" ]; then
  echo "==> Deployment started. Operation: ${OPERATION_NAME}"
  echo "==> Polling for completion..."

  while true; do
    OP_STATUS=$(curl -s \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      "${API_ENDPOINT}/${OPERATION_NAME}" \
    )

    DONE=$(echo "${OP_STATUS}" | grep -o '"done": *true' || true)
    if [ -n "${DONE}" ]; then
      echo "==> Deployment complete!"
      echo "${OP_STATUS}" | python3 -m json.tool 2>/dev/null || echo "${OP_STATUS}"
      break
    fi

    echo "    Still deploying..."
    sleep 10
  done
else
  echo "==> Response:"
  echo "${RESPONSE}" | python3 -m json.tool 2>/dev/null || echo "${RESPONSE}"
fi

# ── 4. Print agent info ──────────────────────────────────────────────────────
echo ""
echo "==> Deployed agent details:"
echo "    Image:   ${IMAGE_URI}"
echo "    Agent:   ${AGENT_NAME}"
echo "    Region:  ${REGION}"
echo ""
echo "==> To query the deployed agent:"
echo "    curl -X POST \\"
echo "      -H 'Authorization: Bearer \$(gcloud auth print-access-token)' \\"
echo "      -H 'Content-Type: application/json' \\"
echo "      -d '{\"class_method\": \"query\", \"input\": {\"prompt\": \"What is 2+2?\"}}' \\"
echo "      '${API_ENDPOINT}/${PARENT}/reasoningEngines/AGENT_ID:query'"
echo ""
echo "==> To list deployed agents:"
echo "    curl -H 'Authorization: Bearer \$(gcloud auth print-access-token)' \\"
echo "      '${API_ENDPOINT}/${PARENT}/reasoningEngines'"
