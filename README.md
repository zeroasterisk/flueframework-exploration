# Flue Framework Exploration

> **TL;DR:** Exploring how to deploy [Flue](https://flueframework.com/) agents on Google Cloud — from simple Cloud Run to GEAP (Gemini Enterprise Agent Platform) sandboxes with full governance. Plus making Flue agents A2A-compliant for agent-to-agent communication.

## Status

| # | Exploration | What | Status | Notes |
|---|---|---|---|---|
| 1 | [Cloud Run](01-cloud-run/) | Flue agent as BYOC container on Cloud Run | ✅ **Deployed & serving** | Health check passing, Gemini 3.1 Flash Lite |
| 2 | [GEAP Agent Runtime](02-geap-agent-runtime/) | Flue agent as BYOC on GEAP Agent Runtime | 🔬 **Working on GEAP BYOC** | Deploy path identified (sourceCodeSpec + imageSpec); optimizing container startup |
| 3 | [GEAP Sandbox (script)](03-geap-sandbox-script/) | Code Execution sandbox — Python/JS only, no shell | ✅ **E2E verified** | Executed code via REST API, confirmed output format |
| 4 | [GEAP Sandbox (BYOC)](04-geap-sandbox-byoc/) | Managed Agents sandbox — full bash, custom container | 🔬 **Prototype** | Client code written, needs deployment testing |
| 5 | [A2A Channel](05-a2a-channel/) | A2A protocol adapter making Flue agents discoverable | 🔬 **Prototype** | Agent Card, message:send, task lifecycle |

## Overview

[Flue](https://flueframework.com/) is a TypeScript agent harness framework (by the [Astro](https://astro.build/) team) that provides the scaffolding for building AI agents: sessions, tools, skills, channels, and sandboxed code execution.

This repo explores **five deployment patterns** — each progressively adding more Google Cloud capabilities:

1. **Cloud Run** — simplest deployment. A Flue agent in a container, serving HTTP. No governance, no sandbox isolation.

2. **GEAP Agent Runtime** — same agent, but deployed via GEAP's managed runtime. Adds SPIFFE agent identity, Agent Gateway integration, and Agent Registry discovery.

3. **GEAP Sandbox (script-only)** — the Code Execution sandbox. Runs Python/JS code snippets in isolation. No shell access, but 14-day state persistence and snapshots.

4. **GEAP Sandbox (BYOC)** — the Managed Agents sandbox with a custom Docker container. Full bash, pip/npm install, persistent filesystem. The most capable sandbox option.

5. **A2A Channel** — makes any Flue agent speak the [A2A protocol](https://google.github.io/A2A/), enabling discovery (Agent Card) and inter-agent communication (message:send, task lifecycle).

## Key Findings

### GEAP Has Two Sandbox Types

This was a critical discovery during E2E testing:

| | Code Execution Sandbox | Managed Agents Sandbox |
|---|---|---|
| **Shell access** | No (code snippets only) | Yes (full bash) |
| **Languages** | Python, JavaScript | Any (Linux container) |
| **Package install** | No | Yes (pip, npm at runtime) |
| **Custom container** | No | Yes (BYOC from Artifact Registry) |
| **Filesystem** | Via code execution | Direct access |
| **Persistence** | 14-day TTL | 7-day TTL |
| **Snapshots** | Yes | Yes |
| **API** | `sandboxEnvironments:execute` | Managed Agents API |

### Real API Format (Verified E2E)

The GEAP Code Execution sandbox REST API uses a Chunk-based encoding that differs from what the discovery doc suggests:

```
POST /v1beta1/{sandboxName}:execute
Body: {
  "inputs": [{
    "data": "<base64 of JSON: {\"code\": \"print('hello')\"}>" ,
    "mimeType": "application/json"
  }]
}
```

This was discovered by reverse-engineering the Python SDK source after the REST discovery doc proved unreliable. See [03-geap-sandbox-script/](03-geap-sandbox-script/) for the verified client implementation.

### Model Configuration

All agents use **Gemini 3.1 Flash Lite** via Vertex AI — configurable via `FLUE_MODEL` env var. No external API keys needed when running on GCP with a service account that has Vertex AI access.

## Project Next Steps

### Immediate
- [ ] **Fix GEAP BYOC deployment** — the `containerSpec` field in the Reasoning Engine API needs the correct format to reference a custom container image. Image is built and in Artifact Registry, just needs the right API call.
- [ ] **Test Exploration 04** — deploy a BYOC sandbox with full bash access and verify shell commands work
- [ ] **Test Exploration 05** — deploy the A2A adapter and verify agent card + message:send with a real A2A client

### Short-term
- [ ] **Combine explorations** — an agent deployed on GEAP Agent Runtime (02) that uses a GEAP sandbox (03/04) for code execution and speaks A2A (05)
- [ ] **AgentMsg channel** — add store-and-forward messaging for agents behind NAT (already prototyped on the [Flue fork](https://github.com/zeroasterisk/flue))
- [ ] **ARD integration** — self-publish agent via [ai-catalog](https://github.com/Agent-Card/ai-catalog) for federated discovery

### GEAP Integration Priorities

| Priority | Integration | Status |
|---|---|---|
| **P1** | Observability → Cloud Trace / GEAP | 🔬 Not started |
| **P1** | Evals → wire into GEAP | 🔬 Not started |
| **P1** | Identity / Registry / Gateway → GEAP governance | 🔬 Not started |
| **P2** | Discord channel (Flue built-in) | 🔬 Not started |
| **P2** | Google Chat channel | 🔬 Not started |
| **P3** | Developer UI (Flue playground, CopilotKit, or ADK web) | 🔬 Not started |

### Longer-term
- [ ] **Submit GEAP sandbox to [2027.dev](https://2027.dev/arena/sandboxes)** — benchmark agent-friendliness against E2B, Daytona, Modal, Cloudflare
- [ ] **Upstream contributions** — A2A channel and GEAP sandbox adapter as PRs to [withastro/flue](https://github.com/withastro/flue)

## GEAP BYOC Deployment Guide

GEAP Agent Runtime supports BYOC containers deployed via `sourceCodeSpec` with `imageSpec`. Here's what we've learned:

**How to deploy:**
1. Package your `Dockerfile` + source files as a `.tar.gz`
2. Base64-encode the archive
3. POST to `/v1beta1/.../reasoningEngines` with `spec.sourceCodeSpec.inlineSource.sourceArchive` + `spec.sourceCodeSpec.imageSpec`
4. GEAP builds the container internally via Cloud Build and deploys it

**Container requirements:**
- Listen on `PORT` env var (auto-injected, default 8080)
- Respond to `POST /api/reasoning_engine` with JSON `{output: ...}`
- Start within ~10 seconds (fast startup is critical)
- Health checks via TCP probe on the configured port

**Environment injected by GEAP:**
- `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION` — GCP context
- `GOOGLE_CLOUD_AGENT_ENGINE_ID` — the reasoning engine resource ID
- `K_SERVICE`, `K_REVISION`, `K_CONFIGURATION` — Cloud Run internals
- `PORT` — container port (do not override)
- `CLOUD_RUN_TIMEOUT_SECONDS` — request timeout (900s)

**Tips:**
- Pre-install all dependencies in the Docker image (no `npm install` at runtime)
- Use a lightweight HTTP server — the ADK `api_server` adds startup latency
- `GOOGLE_CLOUD_PROJECT` and `PORT` are reserved env vars — don't set them in `deploymentSpec.env`

## Key Constraints

- **GEAP env var restrictions** — `GOOGLE_CLOUD_PROJECT`, `PORT`, and other vars are reserved and auto-injected by the platform
- **Fast startup required** — containers must pass health checks within ~10 seconds
- **Flue requires Node.js 22+** — some sandbox environments have older Node.js versions

## Prerequisites

- Node.js 22+ (Flue requires it)
- Google Cloud SDK (`gcloud`) with authenticated service account
- Docker (for building container images)
- GCP project with Vertex AI and Agent Platform APIs enabled

## Quick Start

```bash
# Clone this repo
git clone https://github.com/zeroasterisk/flueframework-exploration.git
cd flueframework-exploration

# Try the Cloud Run exploration locally
cd 01-cloud-run
npm install
npx flue dev
```

## Related Resources

- [Flue Framework](https://flueframework.com/) — the agent framework
- [GEAP Documentation](https://docs.cloud.google.com/gemini-enterprise-agent-platform) — Google's agent platform
- [A2A Protocol](https://google.github.io/A2A/) — agent-to-agent communication spec
- [Sandbox Comparison Gist](https://gist.github.com/zeroasterisk/05ed613b1e4d71aac20b370999fcac69) — GEAP vs E2B vs Daytona vs Modal vs Cloudflare
- [Flue fork with A2A/AgentMsg/ARD packages](https://github.com/zeroasterisk/flue) — upstream contribution candidates
