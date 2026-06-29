# Exploration 4: GEAP Managed Agents Sandbox with BYOC

Use GEAP's Managed Agents Sandbox as a full-featured execution environment for Flue agents — with bash shell access, package installation, persistent filesystem, custom containers (BYOC), and snapshots.

## Code Execution (03) vs Managed Agents Sandbox (04)

| | Code Execution Sandbox (exploration 03) | Managed Agents Sandbox (this exploration) |
|---|---|---|
| **Shell access** | None — script-only | Full bash terminal |
| **Languages** | Python, JavaScript | Any (bash, Python, Node, etc.) |
| **Package install** | Not supported | `pip install`, `npm install` at runtime |
| **Custom container** | No | BYOC via Artifact Registry (Preview) |
| **Network** | None | Configurable allowlist |
| **File I/O** | Sandbox-local only | Full filesystem + GCS mounts |
| **Snapshots** | No | Save/restore state (Preview) |
| **TTL** | 14 days | 7 days (resets on interaction) |
| **API surface** | Scale Sandbox API (`:execute`) | Scale Sandbox API + Interactions API |
| **Use case** | Code interpreter, calculations | Dev environments, system admin, complex tooling |
| **Setup** | No container needed | Optional BYOC Dockerfile |

## Two API Surfaces

GEAP provides two ways to use managed sandboxes:

### 1. Scale Sandbox API (direct control)

Direct CRUD + execute operations on sandbox environments. You send bash commands or Python code and get back stdout/stderr. This is what Flue uses for tool execution.

```
POST   /v1beta1/{agentEngineName}/sandboxEnvironments          — create
POST   /v1beta1/{sandboxName}:execute                          — execute bash/code
GET    /v1beta1/{sandboxName}                                  — get status
DELETE /v1beta1/{sandboxName}                                  — delete
POST   /v1beta1/{sandboxName}:snapshot                         — snapshot (Preview)
POST   /v1beta1/{agentEngineName}/sandboxEnvironments:restore  — restore (Preview)
```

### 2. Interactions API (agent-driven)

Higher-level API that drives the Antigravity agent harness inside the sandbox. You send natural-language instructions; the agent reasons, plans, and executes bash commands autonomously.

```
POST /v1beta1/projects/{project}/locations/global/interactions
```

The agent handles tool selection, error recovery, and multi-step workflows inside the sandbox. The sandbox persists between interactions via `environment_id`.

## BYOC Container Requirements

### Base Requirements

- Container image hosted on **Artifact Registry** (or Docker Hub)
- Python 3.12+ and Node.js 22+ recommended
- The GEAP Agent Platform Service Agent needs read access:

```bash
# Grant the service agent access to your Artifact Registry repo
gcloud artifacts repositories add-iam-policy-binding REPO \
  --project=PROJECT_ID \
  --location=REGION \
  --member="serviceAccount:service-PROJECT_NUMBER@gcp-sa-aiplatform.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"
```

### Building and Pushing the Container

```bash
# Set variables
export PROJECT_ID=your-project-id
export REGION=us-central1

# Create Artifact Registry repo (one-time)
gcloud artifacts repositories create flue \
  --repository-format=docker \
  --location=$REGION \
  --project=$PROJECT_ID

# Build and push
docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/flue/sandbox:latest .
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/flue/sandbox:latest
```

### What the Dockerfile Includes

The included `Dockerfile` builds an image with:

| Tool | Why |
|------|-----|
| Python 3.12 | Agent scripting, data processing |
| Node.js 22 | JavaScript tool execution |
| git | Clone repos, version control |
| curl | HTTP requests from bash |
| jq | JSON processing in bash |
| wget | File downloads |
| requests, httpx | Python HTTP clients |
| pandas, numpy | Data analysis |
| pyyaml | YAML parsing |

## Capability Matrix

| Capability | Default Sandbox | BYOC Sandbox |
|---|---|---|
| Bash shell | Yes | Yes |
| Python 3.12 | Yes | Yes (or custom version) |
| Node.js 22 | Yes | Yes (or custom version) |
| pip install | Yes (with network) | Yes (or pre-installed) |
| npm install | Yes (with network) | Yes (or pre-installed) |
| git, curl, jq | Yes | Yes (or additional tools) |
| Custom system packages | No | Yes (apt-get in Dockerfile) |
| Pre-installed Python libs | Limited | Unlimited |
| Custom binaries | No | Yes |
| Network access | Allowlist | Allowlist |
| GCS mount | Yes | Yes |
| Snapshots | Yes (Preview) | Yes (Preview) |
| 7-day TTL | Yes | Yes |

## How Flue Would Use This

A Flue agent uses the managed sandbox as a remote execution environment. The agent orchestrates locally (or on Cloud Run) but offloads bash commands, code execution, and file operations to the sandbox:

```
┌─────────────┐     ┌────────────────────────────────────┐
│  Flue Agent  │────▶│  GEAP Managed Agents Sandbox       │
│  (local/CR)  │◀────│  ┌──────────────────────────────┐  │
└─────────────┘     │  │  BYOC Container               │  │
     │              │  │  - Python 3.12, Node.js 22    │  │
     │              │  │  - git, curl, jq              │  │
     │  executeBash  │  │  - pip/npm packages           │  │
     │  executePython│  │  - Custom tools               │  │
     │  readFile     │  │  - Persistent filesystem      │  │
     │  writeFile    │  └──────────────────────────────┘  │
     │  snapshot     └────────────────────────────────────┘
```

Use cases:
- **Code interpreter** — execute agent-generated Python/bash with full package access
- **Dev environment** — clone a repo, install deps, run tests, report results
- **Data pipeline** — process files with pandas/numpy in a sandbox
- **System administration** — run system commands in an isolated environment

## Project Structure

```
Dockerfile                  — BYOC container image
.dockerignore               — Docker build exclusions
src/
  geap-managed-sandbox.ts   — Client for Scale Sandbox API + Interactions API
  demo.ts                   — Demo: bash commands, pip install, file I/O, snapshots
```

## Environment Setup

```bash
# Required
export GOOGLE_CLOUD_PROJECT=your-project-id
export GOOGLE_ACCESS_TOKEN=$(gcloud auth print-access-token)

# Optional: use a custom container
export BYOC_IMAGE=us-central1-docker.pkg.dev/$GOOGLE_CLOUD_PROJECT/flue/sandbox:latest
```

The access token must have permissions for the Vertex AI API (`aiplatform.googleapis.com`).

## Running the Demo

```bash
pnpm install
pnpm demo              # Scale Sandbox API demo (direct control)
pnpm demo interactions # Interactions API demo (agent-driven)
pnpm demo both         # Run both demos
```

### Scale Sandbox API demo steps:

1. Creates an agent engine + managed sandbox (optionally with BYOC image)
2. Runs bash commands: `ls`, system info, tool versions, `curl`
3. Installs `requests` with `pip install`
4. Writes and runs a Python script that uses the installed package
5. Reads/writes files in the sandbox
6. Snapshots the sandbox state (Preview feature)
7. Cleans up all resources

### Interactions API demo steps:

1. Creates a new sandbox via the Interactions API
2. Agent writes and runs a Python script autonomously
3. Agent installs numpy and runs a statistics script (multi-turn)
4. Verifies state persistence across interactions

## API Details

### Creating a Managed Sandbox (Scale Sandbox API)

```
POST /v1beta1/{agentEngineName}/sandboxEnvironments

Body:
{
  "spec": {
    "managedEnvironment": {
      "containerImage": "us-docker.pkg.dev/PROJECT/REPO/IMAGE:TAG",
      "networkAccess": {
        "allowlist": [{ "domain": "*" }]
      }
    }
  }
}
```

For the default GEAP image, omit `containerImage`. The sandbox starts with Ubuntu, Python 3.12, Node.js 22, and standard Linux utilities.

### Executing Bash Commands

```
POST /v1beta1/{sandboxName}:execute

Body:
{
  "inputs": [{
    "data": base64(JSON.stringify({ command: "ls -la" })),
    "mimeType": "application/json"
  }]
}

Response:
{
  "outputs": [{
    "data": base64(JSON.stringify({
      "exit_status_int": 0,
      "msg_out": "total 4\ndrwxr-xr-x ...\n",
      "msg_err": ""
    })),
    "mimeType": "application/json"
  }]
}
```

### Interactions API

```
POST /v1beta1/projects/{project}/locations/global/interactions

Body:
{
  "agent": "antigravity-preview-05-2026",
  "input": "Install pandas and analyze the CSV file",
  "environment": "remote"
}

Response:
{
  "interaction": {
    "id": "interaction-xyz",
    "environmentId": "env-abc123",
    "outputText": "I've installed pandas and analyzed...",
    "steps": [
      { "type": "bash", "content": "pip install pandas" },
      { "type": "code", "content": "import pandas as pd\n..." },
      { "type": "text", "content": "The analysis shows..." }
    ]
  }
}
```

## Verification Notes

> **The BYOC custom container feature is in Preview.** The following API details need E2E verification against a live GEAP environment:

1. **Sandbox spec for BYOC** — The `managedEnvironment.containerImage` field name is inferred from SDK patterns and release notes. The actual REST field may differ.
2. **Bash execution input format** — The code execution sandbox uses `{ code: "..." }`. The managed sandbox likely uses `{ command: "..." }` for bash, but this needs confirmation.
3. **Snapshot/restore endpoints** — The `:snapshot` and `:restore` endpoints are inferred from the Preview feature description. The exact REST paths and request/response formats need verification.
4. **Interactions API response schema** — The `interaction.steps` structure is based on documentation descriptions. The exact step types and fields need confirmation.
5. **Network allowlist format** — The `networkAccess.allowlist` format is consistent with the Agents API, but may differ in the Scale Sandbox API.
