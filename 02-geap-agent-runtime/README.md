# Exploration 2: Flue Agent on GEAP Agent Runtime

A Flue agent deployed as BYOC (Bring Your Own Container) on Google's Gemini Enterprise Agent Platform (GEAP) Agent Runtime.

## What This Does

Deploys the same **Explorer** agent from [Exploration 1](../01-cloud-run/) — a Flue agent with a calculator tool — but targets GEAP Agent Runtime instead of Cloud Run. The agent:

- Is packaged as a container image pushed to **Artifact Registry** (not GCR)
- Is deployed via the GEAP **Agent Runtime REST API** (`reasoningEngines`)
- Gets managed lifecycle, scaling, and identity from GEAP
- Can integrate with **Agent Gateway** for governed traffic and **Agent Registry** for discovery
- Supports SPIFFE-based **agent identity** for fine-grained IAM

## How It Differs from Cloud Run (Exploration 1)

| Aspect | Cloud Run (01) | GEAP Agent Runtime (02) |
|--------|---------------|------------------------|
| **Registry** | Container Registry (`gcr.io`) | Artifact Registry (`-docker.pkg.dev`) |
| **Deploy command** | `gcloud run deploy` | REST API to `reasoningEngines` endpoint |
| **Scaling** | Cloud Run autoscaler | GEAP managed scaling (`min/max_instances`) |
| **Identity** | Service account only | SPIFFE agent identity + service account |
| **Traffic governance** | IAM + Cloud Run auth | Agent Gateway (mTLS, MCP security, policies) |
| **Discovery** | Service URL | Agent Registry integration |
| **Sandbox** | Stateless container | Managed sandbox (7-day TTL, filesystem persistence) |
| **Lifecycle** | Serverless (scale to zero) | Managed agent lifecycle (long-running, up to 7 days) |
| **Health checks** | `/health` | `/health` + `/ready` (liveness + readiness) |

### Key Architectural Differences

**Cloud Run** treats your agent like any HTTP service — you get a URL, manage auth yourself, and each request is stateless.

**GEAP Agent Runtime** treats your agent as a first-class agent:
- **Agent Gateway** intercepts all outbound calls (to tools, other agents, APIs) and enforces access policies
- **SPIFFE identity** gives each agent a cryptographic identity that's distinct from the service account, enabling per-agent IAM permissions
- **Agent Registry** makes your agent discoverable by other agents in the platform
- **Managed sandbox** provides persistent filesystem and up to 7-day operation windows

## Project Structure

```
02-geap-agent-runtime/
├── src/
│   ├── agents/explorer.ts   # Agent definition (same as 01, updated instructions)
│   └── app.ts               # Hono app with /health + /ready endpoints
├── flue.config.ts            # Build config (target: node)
├── Dockerfile                # Container image with HEALTHCHECK
├── cloudbuild.yaml           # Cloud Build → Artifact Registry → GEAP deploy
├── setup-gcp.sh              # One-time GCP environment setup
├── deploy.sh                 # Build, push, and deploy to GEAP Agent Runtime
├── package.json
└── tsconfig.json
```

## Prerequisites

- [gcloud CLI](https://cloud.google.com/sdk/docs/install) authenticated with project owner/editor
- Docker installed
- `ANTHROPIC_API_KEY` for Claude model access
- A GCP project with billing enabled

## Setup

### 1. Set environment variables

```bash
export GCP_PROJECT_ID=my-project
export GCP_REGION=us-central1          # optional, defaults to us-central1
export ANTHROPIC_API_KEY=sk-ant-...
```

### 2. Run one-time GCP setup

```bash
./setup-gcp.sh
```

This enables APIs, creates an Artifact Registry repository, creates a service account, and grants the necessary IAM roles — including access for the GEAP tenant service account.

### 3. Install dependencies

```bash
pnpm install
```

## Local Development

```bash
# Start dev server (same as Exploration 1)
pnpm dev

# Test the agent
curl -X POST http://localhost:3583/agents/explorer/my-session \
  -H 'Content-Type: application/json' \
  -d '{"prompt": "What is 144 * 12?"}'
```

## Deploy to GEAP Agent Runtime

### Option A: deploy.sh (recommended)

```bash
./deploy.sh
```

This builds the image, pushes to Artifact Registry, and creates the agent on GEAP Agent Runtime via the REST API.

### Option B: Cloud Build

```bash
gcloud builds submit \
  --config cloudbuild.yaml \
  --substitutions _ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}"
```

### Option C: Step by step

```bash
REGION=us-central1
PROJECT_ID=my-project
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/flue-agents"
IMAGE="${REGISTRY}/flue-explorer:latest"

# Build and push
docker build -t "${IMAGE}" .
docker push "${IMAGE}"

# Deploy via REST API
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d "{
    \"displayName\": \"flue-explorer\",
    \"spec\": {
      \"containerSpec\": {
        \"imageUri\": \"${IMAGE}\",
        \"env\": [
          {\"name\": \"ANTHROPIC_API_KEY\", \"value\": \"${ANTHROPIC_API_KEY}\"},
          {\"name\": \"PORT\", \"value\": \"8080\"}
        ]
      }
    }
  }" \
  "https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/reasoningEngines"
```

## Query the Deployed Agent

```bash
# List deployed agents
curl -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/reasoningEngines"

# Query a specific agent (replace AGENT_ID with the actual ID)
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{"class_method": "query", "input": {"prompt": "Use the calculator to compute 2^10"}}' \
  "https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/reasoningEngines/AGENT_ID:query"
```

## Scaling Configuration

GEAP Agent Runtime supports resource and scaling configuration at deploy time:

```json
{
  "config": {
    "min_instances": 1,
    "max_instances": 10,
    "resource_limits": {
      "cpu": "4",
      "memory": "8Gi"
    },
    "container_concurrency": 9
  }
}
```

The recommended `container_concurrency` formula is `2 * cpu + 1`.

## Agent Identity (SPIFFE)

GEAP Agent Runtime can assign a SPIFFE-based identity to your agent, which:

- Provides a unique cryptographic identity per agent (not shared service accounts)
- Enables per-agent IAM permissions (e.g., access specific BigQuery datasets or Cloud Storage buckets)
- Auto-provisions and manages x509 certificates
- Integrates with Agent Gateway for mTLS enforcement
- Creates a clear audit trail for agent actions

Default roles granted to agent identities:
- `roles/aiplatform.agentContextEditor`
- `roles/aiplatform.agentDefaultAccess`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GCP_PROJECT_ID` | Yes | Google Cloud project ID |
| `GCP_REGION` | No | Deployment region (default: `us-central1`) |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude model access |
| `ARTIFACT_REPO` | No | Artifact Registry repo name (default: `flue-agents`) |
| `AGENT_SA_NAME` | No | Service account name (default: `flue-agent-sa`) |
| `AGENT_NAME` | No | Agent display name (default: `flue-explorer`) |
| `PORT` | No | Container port (default: `8080`) |

## References

- [GEAP Agent Runtime overview](https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/runtime)
- [GEAP BYOC setup](https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/runtime/setup)
- [Deploy an agent](https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale/runtime/deploy-an-agent)
- [Agent identity](https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale/runtime/agent-identity)
- [Agent Gateway](https://docs.cloud.google.com/gemini-enterprise-agent-platform/govern/gateways/agent-gateway-overview)
