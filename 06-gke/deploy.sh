#!/usr/bin/env bash
# Deploy Flue Explorer agent to GKE.
#
# This script:
#   1. Builds and pushes the container image to Artifact Registry
#   2. Patches k8s manifests with project-specific values
#   3. Applies k8s manifests to the current cluster
#   4. Waits for the deployment to become ready
#   5. Prints the service URL
#
# Prerequisites:
#   - GKE cluster created with Workload Identity enabled
#   - kubectl configured to target the cluster
#   - Artifact Registry repository created
#   - GCP service account with Vertex AI access
#   - Docker (or gcloud) for building images
#
# Usage:
#   export GCP_PROJECT_ID=my-project
#   ./deploy.sh

set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
REGION="${GCP_REGION:-us-central1}"
REPO_NAME="${ARTIFACT_REPO:-flue-agents}"
AGENT_NAME="${AGENT_NAME:-flue-explorer}"
NAMESPACE="${K8S_NAMESPACE:-default}"
SERVICE_ACCOUNT_NAME="${AGENT_SA_NAME:-flue-agent-sa}"
SA_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}"
IMAGE="${REGISTRY}/${AGENT_NAME}"
TAG="$(date +%Y%m%d-%H%M%S)"
IMAGE_URI="${IMAGE}:${TAG}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
K8S_DIR="${SCRIPT_DIR}/k8s"

# ── 1. Build container image ────────────────────────────────────────────────
echo "==> Building container image: ${IMAGE_URI}"
docker build -t "${IMAGE_URI}" -t "${IMAGE}:latest" "${SCRIPT_DIR}"

# ── 2. Push to Artifact Registry ────────────────────────────────────────────
echo "==> Configuring Docker for Artifact Registry..."
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

echo "==> Pushing to Artifact Registry..."
docker push "${IMAGE_URI}"
docker push "${IMAGE}:latest"

# ── 3. Patch and apply k8s manifests ─────────────────────────────────────────
echo "==> Applying k8s manifests to namespace: ${NAMESPACE}"

# Apply ConfigMap with project-specific values
sed "s|GOOGLE_CLOUD_PROJECT: \"\"|GOOGLE_CLOUD_PROJECT: \"${PROJECT_ID}\"|" \
  "${K8S_DIR}/configmap.yaml" | kubectl apply -n "${NAMESPACE}" -f -

# Apply ServiceAccount with Workload Identity annotation
sed "s|iam.gke.io/gcp-service-account: \"\"|iam.gke.io/gcp-service-account: \"${SA_EMAIL}\"|" \
  "${K8S_DIR}/serviceaccount.yaml" | kubectl apply -n "${NAMESPACE}" -f -

# Apply Deployment with the correct image
sed "s|image: IMAGE_PLACEHOLDER|image: ${IMAGE_URI}|" \
  "${K8S_DIR}/deployment.yaml" | kubectl apply -n "${NAMESPACE}" -f -

# Apply Service
kubectl apply -n "${NAMESPACE}" -f "${K8S_DIR}/service.yaml"

# ── 4. Bind Workload Identity (idempotent) ───────────────────────────────────
echo "==> Binding Workload Identity..."
gcloud iam service-accounts add-iam-policy-binding "${SA_EMAIL}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:${PROJECT_ID}.svc.id.goog[${NAMESPACE}/flue-explorer-sa]" \
  --quiet 2>/dev/null || echo "    (Workload Identity binding may already exist)"

# ── 5. Wait for deployment ───────────────────────────────────────────────────
echo "==> Waiting for deployment to become ready..."
kubectl rollout status deployment/flue-explorer -n "${NAMESPACE}" --timeout=120s

# ── 6. Print service URL ────────────────────────────────────────────────────
echo ""
echo "==> Deployment complete!"
echo ""
echo "    Image:     ${IMAGE_URI}"
echo "    Namespace: ${NAMESPACE}"
echo ""

# Wait briefly for external IP assignment
echo "==> Waiting for external IP..."
for i in $(seq 1 30); do
  EXTERNAL_IP=$(kubectl get svc flue-explorer -n "${NAMESPACE}" \
    -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || true)
  if [ -n "${EXTERNAL_IP}" ]; then
    break
  fi
  sleep 2
done

if [ -n "${EXTERNAL_IP:-}" ]; then
  echo "    Service URL: http://${EXTERNAL_IP}/"
  echo ""
  echo "==> Test with:"
  echo "    curl http://${EXTERNAL_IP}/"
  echo "    curl -X POST http://${EXTERNAL_IP}/ -H 'Content-Type: application/json' -d '{\"prompt\": \"What is 2+2?\"}'"
else
  echo "    External IP not yet assigned. Check with:"
  echo "    kubectl get svc flue-explorer -n ${NAMESPACE}"
fi
