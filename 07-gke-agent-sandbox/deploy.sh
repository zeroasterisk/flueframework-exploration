#!/usr/bin/env bash
#
# Deploy Flue Agent to GKE Agent Sandbox.
#
# This script:
#   1. Validates prerequisites (gcloud, kubectl, GKE 1.35.2+)
#   2. Enables Agent Sandbox on the cluster (if not already)
#   3. Creates a gVisor node pool (if not already)
#   4. Builds and pushes the custom container image
#   5. Installs the Agent Sandbox controller + extensions
#   6. Applies the k8s manifests (SandboxTemplate, WarmPool, Router, ConfigMap)
#   7. Creates a SandboxClaim to provision a sandbox from the pool
#
# Usage:
#   export GOOGLE_CLOUD_PROJECT=your-project-id
#   export CLUSTER_NAME=your-cluster-name
#   export CLUSTER_ZONE=us-central1-a          # or CLUSTER_REGION for regional
#   ./deploy.sh
#
# Prerequisites:
#   - GKE cluster running 1.35.2-gke.1269000 or later
#   - gcloud CLI authenticated
#   - kubectl configured for the cluster
#   - Docker (or gcloud builds) for building the image

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────

PROJECT="${GOOGLE_CLOUD_PROJECT:?Set GOOGLE_CLOUD_PROJECT}"
CLUSTER="${CLUSTER_NAME:?Set CLUSTER_NAME}"
ZONE="${CLUSTER_ZONE:-us-central1-a}"
REGION="${CLUSTER_REGION:-us-central1}"
NAMESPACE="${NAMESPACE:-default}"

# Image settings
REPO_NAME="flue"
IMAGE_NAME="agent-sandbox"
IMAGE_TAG="latest"
IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT}/${REPO_NAME}/${IMAGE_NAME}:${IMAGE_TAG}"

# Node pool settings
SANDBOX_POOL_NAME="sandbox-pool"
SANDBOX_POOL_MACHINE_TYPE="e2-standard-4"
SANDBOX_POOL_SIZE=1

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Helpers ───────────────────────────────────────────────────

log()  { echo "$(date '+%H:%M:%S') [INFO]  $*"; }
warn() { echo "$(date '+%H:%M:%S') [WARN]  $*" >&2; }
fail() { echo "$(date '+%H:%M:%S') [ERROR] $*" >&2; exit 1; }

check_command() {
	command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

# ── Step 0: Validate prerequisites ───────────────────────────

log "Checking prerequisites..."
check_command gcloud
check_command kubectl
check_command docker

# Verify gcloud project
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [[ "$CURRENT_PROJECT" != "$PROJECT" ]]; then
	log "Setting gcloud project to $PROJECT"
	gcloud config set project "$PROJECT"
fi

# ── Step 1: Enable Agent Sandbox on the cluster ──────────────

log "Enabling Agent Sandbox add-on on cluster $CLUSTER..."
if gcloud container clusters describe "$CLUSTER" --zone="$ZONE" --project="$PROJECT" \
	--format='value(addonsConfig.agentSandboxConfig.enabled)' 2>/dev/null | grep -q 'True'; then
	log "Agent Sandbox already enabled on cluster $CLUSTER"
else
	log "Updating cluster to enable Agent Sandbox..."
	gcloud container clusters update "$CLUSTER" \
		--zone="$ZONE" \
		--project="$PROJECT" \
		--enable-agent-sandbox \
		--quiet
	log "Agent Sandbox enabled."
fi

# ── Step 2: Create gVisor node pool (if needed) ──────────────

log "Checking for gVisor node pool..."
if gcloud container node-pools describe "$SANDBOX_POOL_NAME" \
	--cluster="$CLUSTER" --zone="$ZONE" --project="$PROJECT" >/dev/null 2>&1; then
	log "Node pool $SANDBOX_POOL_NAME already exists"
else
	log "Creating gVisor node pool: $SANDBOX_POOL_NAME"
	gcloud container node-pools create "$SANDBOX_POOL_NAME" \
		--cluster="$CLUSTER" \
		--zone="$ZONE" \
		--project="$PROJECT" \
		--machine-type="$SANDBOX_POOL_MACHINE_TYPE" \
		--num-nodes="$SANDBOX_POOL_SIZE" \
		--sandbox="type=gvisor" \
		--quiet
	log "Node pool created with gVisor sandbox enabled."
fi

# ── Step 3: Create Artifact Registry repo (if needed) ────────

log "Ensuring Artifact Registry repo exists..."
if gcloud artifacts repositories describe "$REPO_NAME" \
	--location="$REGION" --project="$PROJECT" >/dev/null 2>&1; then
	log "Artifact Registry repo $REPO_NAME already exists"
else
	log "Creating Artifact Registry repo: $REPO_NAME"
	gcloud artifacts repositories create "$REPO_NAME" \
		--repository-format=docker \
		--location="$REGION" \
		--project="$PROJECT" \
		--quiet
fi

# ── Step 4: Build and push container image ────────────────────

log "Building container image: $IMAGE_URI"

# Configure Docker for Artifact Registry
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet 2>/dev/null

# Build using Cloud Build (works without local Docker daemon)
if [[ "${USE_CLOUD_BUILD:-false}" == "true" ]]; then
	log "Building with Cloud Build..."
	gcloud builds submit "$SCRIPT_DIR" \
		--tag="$IMAGE_URI" \
		--project="$PROJECT" \
		--quiet
else
	log "Building locally with Docker..."
	docker build -t "$IMAGE_URI" "$SCRIPT_DIR"
	docker push "$IMAGE_URI"
fi

log "Image pushed: $IMAGE_URI"

# ── Step 5: Install Agent Sandbox controller ──────────────────

log "Installing Agent Sandbox controller..."

# The GKE managed add-on handles this automatically when --enable-agent-sandbox
# is set. For manual installation (e.g., non-GKE clusters), uncomment:
#
# AGENT_SANDBOX_VERSION="v0.2.1"
# kubectl apply -f "https://github.com/kubernetes-sigs/agent-sandbox/releases/download/${AGENT_SANDBOX_VERSION}/manifest.yaml"
# kubectl apply -f "https://github.com/kubernetes-sigs/agent-sandbox/releases/download/${AGENT_SANDBOX_VERSION}/extensions.yaml"

log "Using GKE managed Agent Sandbox add-on (controller auto-installed)."

# ── Step 6: Apply k8s manifests ───────────────────────────────

log "Applying Kubernetes manifests..."

# Update ConfigMap with project ID
log "  Applying ConfigMap..."
kubectl apply -f "$SCRIPT_DIR/k8s/configmap.yaml" -n "$NAMESPACE"
kubectl patch configmap flue-sandbox-config -n "$NAMESPACE" \
	-p "{\"data\":{\"GOOGLE_CLOUD_PROJECT\":\"$PROJECT\"}}"

# Apply SandboxTemplate + WarmPool (with image substitution)
log "  Applying SandboxTemplate + WarmPool..."
sed "s|IMAGE_PLACEHOLDER|${IMAGE_URI}|g" "$SCRIPT_DIR/k8s/sandbox-template.yaml" | \
	kubectl apply -f - -n "$NAMESPACE"

# Apply sandbox router
log "  Applying Sandbox Router..."
kubectl apply -f "$SCRIPT_DIR/k8s/sandbox-router.yaml" -n "$NAMESPACE"

# ── Step 7: Wait for warm pool pods ──────────────────────────

log "Waiting for warm pool pods to be ready..."
for i in $(seq 1 30); do
	READY=$(kubectl get pods -n "$NAMESPACE" -l app=flue-agent-sandbox \
		--field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l)
	if [[ "$READY" -ge 1 ]]; then
		log "  $READY warm pool pod(s) ready."
		break
	fi
	if [[ "$i" -eq 30 ]]; then
		warn "Warm pool pods not ready after 150s — check: kubectl get pods -l app=flue-agent-sandbox"
	fi
	sleep 5
done

# ── Step 8: Create SandboxClaim ───────────────────────────────

log "Creating SandboxClaim (allocates a sandbox from the warm pool)..."
kubectl apply -f "$SCRIPT_DIR/k8s/sandbox-claim.yaml" -n "$NAMESPACE"

# Wait for claim to bind
for i in $(seq 1 12); do
	PHASE=$(kubectl get sandboxclaim flue-agent-claim -n "$NAMESPACE" \
		-o jsonpath='{.status.phase}' 2>/dev/null || echo "Pending")
	if [[ "$PHASE" == "Bound" ]]; then
		log "  SandboxClaim bound!"
		break
	fi
	log "  Claim phase: $PHASE (waiting...)"
	sleep 5
done

# ── Summary ───────────────────────────────────────────────────

echo ""
log "Deployment complete!"
echo ""
echo "  Cluster:    $CLUSTER ($ZONE)"
echo "  Image:      $IMAGE_URI"
echo "  Namespace:  $NAMESPACE"
echo ""
echo "  Resources created:"
echo "    - SandboxTemplate: flue-agent-template"
echo "    - SandboxWarmPool: flue-agent-pool (2 replicas)"
echo "    - SandboxClaim:    flue-agent-claim"
echo "    - Sandbox Router:  sandbox-router-svc"
echo "    - ConfigMap:       flue-sandbox-config"
echo ""
echo "  Next steps:"
echo "    # Port-forward the router to test locally:"
echo "    kubectl port-forward svc/sandbox-router-svc 8080:8080"
echo ""
echo "    # Run the demo client:"
echo "    pnpm demo"
echo ""
echo "    # Check sandbox status:"
echo "    kubectl get sandboxes,sandboxclaims,sandboxwarmpools"
echo ""
echo "    # View sandbox pods:"
echo "    kubectl get pods -l app=flue-agent-sandbox"
