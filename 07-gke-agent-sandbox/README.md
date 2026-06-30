# Exploration 7: GKE Agent Sandbox with Custom Image

Deploy a Flue agent to GKE using Agent Sandbox — kernel-level isolation via gVisor for secure AI code execution with sub-second provisioning.

## What is GKE Agent Sandbox?

GKE Agent Sandbox provides isolated, stateful, singleton workloads purpose-built for AI agent runtimes. It uses [gVisor](https://gvisor.dev/) — the same sandboxing technology that secures Gemini — to provide kernel-level isolation between untrusted agent code and the host OS.

The project originated as a [Kubernetes SIG Apps subproject](https://github.com/kubernetes-sigs/agent-sandbox) (KubeCon NA 2025) and is available as a managed GKE add-on at no additional cost.

### Key capabilities

| Feature | Detail |
|---|---|
| **Isolation** | gVisor kernel-level sandbox — syscall interception, not just namespace isolation |
| **Provisioning** | Sub-second via SandboxWarmPool (pre-warmed pods, ~100ms claim transfer) |
| **Snapshots** | Pause/resume sandbox state with Pod snapshots (Preview) |
| **Custom images** | Bring your own container image via SandboxTemplate |
| **Networking** | Secure-by-default; explicit allowlists required for internal/external access |
| **Stable identity** | Each sandbox gets a stable hostname and network endpoint |
| **Routing** | Sandbox Router proxies traffic to pods via `X-Sandbox-ID` header |

## How it differs from GEAP Sandbox (Exploration 04)

| | GEAP Managed Sandbox (exploration 04) | GKE Agent Sandbox (this exploration) |
|---|---|---|
| **Management** | Fully managed by Google | Self-managed on your GKE cluster |
| **API** | Google REST API (`/v1beta1/.../sandboxEnvironments`) | Kubernetes CRDs + in-cluster HTTP |
| **Isolation** | Google-managed VM/container | gVisor (kernel-level, your cluster) |
| **Provisioning** | Seconds | Sub-second (warm pools) |
| **Custom image** | BYOC via Artifact Registry (Preview) | Full control — any image in SandboxTemplate |
| **Networking** | Allowlist via API | NetworkPolicy / SandboxTemplate spec |
| **Cost** | GEAP pricing | GKE pricing only (add-on is free) |
| **Snapshots** | Preview (via API) | Preview (Pod snapshots) |
| **Client** | REST API calls from anywhere | In-cluster via sandbox-router |
| **Use case** | Serverless sandbox, no cluster needed | Full control, existing GKE workloads |

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  GKE Cluster (Agent Sandbox enabled)                             │
│                                                                  │
│  ┌──────────────────────┐     ┌────────────────────────────────┐ │
│  │  Your App / Client   │────▶│  Sandbox Router (ClusterIP)    │ │
│  │                      │     │  Routes via X-Sandbox-ID header│ │
│  └──────────────────────┘     └───────────┬────────────────────┘ │
│                                           │                      │
│                    ┌──────────────────────┬┴──────────────────┐   │
│                    ▼                      ▼                   │   │
│  ┌─────────────────────────┐  ┌─────────────────────────┐    │   │
│  │  Sandbox Pod (claimed)  │  │  Sandbox Pod (warm pool)│    │   │
│  │  ┌───────────────────┐  │  │  ┌───────────────────┐  │    │   │
│  │  │  gVisor Kernel     │  │  │  │  gVisor Kernel     │  │    │   │
│  │  │  ┌──────────────┐  │  │  │  │  ┌──────────────┐  │  │    │   │
│  │  │  │ Node.js      │  │  │  │  │  │ Node.js      │  │  │    │   │
│  │  │  │ Exec Server  │  │  │  │  │  │ Exec Server  │  │  │    │   │
│  │  │  │ /exec /eval  │  │  │  │  │  │ (idle)       │  │  │    │   │
│  │  │  └──────────────┘  │  │  │  │  └──────────────┘  │  │    │   │
│  │  └───────────────────┘  │  │  └───────────────────┘  │    │   │
│  └─────────────────────────┘  └─────────────────────────┘    │   │
│                                                              │   │
│  gVisor Node Pool (sandbox.gke.io/runtime: gvisor)           │   │
└──────────────────────────────────────────────────────────────────┘
```

## CRD Model: SandboxTemplate / SandboxClaim

GKE Agent Sandbox uses Kubernetes CRDs to declaratively manage sandboxes, similar to how PersistentVolume/PersistentVolumeClaim work for storage:

### SandboxTemplate

A reusable blueprint that defines the container image, resources, security context, and runtime class for sandbox pods.

```yaml
apiVersion: extensions.agents.x-k8s.io/v1alpha1
kind: SandboxTemplate
metadata:
  name: flue-agent-template
spec:
  podTemplate:
    spec:
      runtimeClassName: gvisor
      containers:
        - name: flue-agent
          image: us-docker.pkg.dev/PROJECT/flue/agent-sandbox:latest
          # ... resources, security, probes
```

### SandboxWarmPool

Keeps N pre-warmed pods running from a template. When a SandboxClaim arrives, ownership transfers from the pool to the claim in ~100ms — no cold start.

```yaml
apiVersion: extensions.agents.x-k8s.io/v1alpha1
kind: SandboxWarmPool
metadata:
  name: flue-agent-pool
spec:
  replicas: 2
  sandboxTemplateRef:
    name: flue-agent-template
```

### SandboxClaim

Request a sandbox from the pool. The controller binds an available warm pod (or creates a new one).

```yaml
apiVersion: extensions.agents.x-k8s.io/v1alpha1
kind: SandboxClaim
metadata:
  name: flue-agent-claim
spec:
  sandboxTemplateRef:
    name: flue-agent-template
```

## Prerequisites

- **GKE cluster** running version **1.35.2-gke.1269000** or later
- **gVisor node pool** (`--sandbox type=gvisor`)
- **Artifact Registry** repo for the custom container image
- `gcloud` CLI authenticated with project access
- `kubectl` configured for the target cluster
- `docker` for building the container image (or use Cloud Build)

## Project Structure

```
Dockerfile                — Custom sandbox container (Node.js exec server)
.dockerignore             — Docker build exclusions
deploy.sh                 — Full deployment script
package.json              — Node.js project config
tsconfig.json             — TypeScript config
src/
  server.ts               — Execution server (runs inside sandbox pod)
  client.ts               — Demo client (talks to sandbox via router)
k8s/
  sandbox-template.yaml   — SandboxTemplate + SandboxWarmPool CRDs
  sandbox-claim.yaml      — SandboxClaim CRD
  sandbox-router.yaml     — Router Deployment + ClusterIP Service
  configmap.yaml          — Environment configuration
```

## Deployment

```bash
# Set required environment variables
export GOOGLE_CLOUD_PROJECT=your-project-id
export CLUSTER_NAME=your-cluster-name
export CLUSTER_ZONE=us-central1-a

# Deploy everything
./deploy.sh

# Or use Cloud Build instead of local Docker:
USE_CLOUD_BUILD=true ./deploy.sh
```

The deploy script will:
1. Enable Agent Sandbox add-on on your cluster
2. Create a gVisor node pool (if needed)
3. Build and push the container image
4. Apply all k8s manifests
5. Create a SandboxClaim and wait for it to bind

## Testing

```bash
# Install dependencies
pnpm install

# Port-forward the sandbox router
kubectl port-forward svc/sandbox-router-svc 8080:8080

# Run the demo client
pnpm demo

# Or with custom settings:
ROUTER_URL=http://localhost:8080 SANDBOX_ID=flue-agent-claim pnpm demo
```

### Manual testing with curl

```bash
# Port-forward first
kubectl port-forward svc/sandbox-router-svc 8080:8080

# Health check
curl -H "X-Sandbox-ID: flue-agent-claim" http://localhost:8080/health

# Sandbox info
curl -H "X-Sandbox-ID: flue-agent-claim" http://localhost:8080/info

# Execute a bash command
curl -X POST -H "X-Sandbox-ID: flue-agent-claim" \
  -H "Content-Type: application/json" \
  -d '{"command": "uname -a"}' \
  http://localhost:8080/exec

# Evaluate JavaScript
curl -X POST -H "X-Sandbox-ID: flue-agent-claim" \
  -H "Content-Type: application/json" \
  -d '{"code": "return 42 * 17"}' \
  http://localhost:8080/eval
```

## Server API

The execution server running inside each sandbox pod exposes:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness probe |
| `GET` | `/ready` | Readiness probe |
| `GET` | `/info` | Sandbox environment info |
| `POST` | `/exec` | Execute bash command (`{ "command": "..." }`) |
| `POST` | `/eval` | Evaluate JavaScript (`{ "code": "..." }`) |
| `POST` | `/query` | Agent query (compatibility with exploration 06) |

### POST /exec

```json
// Request
{ "command": "ls -la /workspace", "timeout": 10000 }

// Response
{ "stdout": "...", "stderr": "", "exitCode": 0, "durationMs": 12 }
```

### POST /eval

```json
// Request
{ "code": "return JSON.stringify({ pi: Math.PI })" }

// Response
{ "result": "{\"pi\":3.141592653589793}", "durationMs": 1 }
```

## Verification Status

> **GKE Agent Sandbox is GA** (add-on) with some features in Preview. The following need E2E verification against a live cluster:

1. **CRD field names** — `extensions.agents.x-k8s.io/v1alpha1` API version and field names are from official docs but the extension CRDs are still `v1alpha1` and may change.
2. **Sandbox Router image** — The `k8s-staging-images` registry path is from the kubernetes-sigs project; GKE's managed add-on may use a different image.
3. **Warm pool behavior** — Sub-second claim binding is documented but actual latency depends on cluster state and node readiness.
4. **Security enforcement** — The Validating Admission Policy requirements (gvisor runtime, non-root, capabilities drop) are documented but the exact error messages when violations occur need testing.
5. **X-Sandbox-ID routing** — The header-based routing through the sandbox-router is from the kubernetes-sigs documentation; the GKE managed version may use a different routing mechanism.
