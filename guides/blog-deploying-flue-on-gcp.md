# Deploying Flue Agents on Google Cloud — 5 Ways

> **Draft blog post / DevRel asset**

## TL;DR

[Flue](https://flueframework.com/) is a TypeScript agent framework by the Astro team. We explored deploying Flue agents across five Google Cloud targets — from simple Cloud Run to fully governed GEAP Agent Runtime — and added A2A protocol support for agent-to-agent communication. Here's what we learned.

## Why Flue on Google Cloud?

Flue gives you the agent harness (sessions, tools, skills, channels). Google Cloud gives you the production infrastructure (scaling, identity, governance, sandboxing). Together, you get agents that are both developer-friendly and enterprise-ready.

## The Five Deployment Targets

### 1. Cloud Run — The Simple Path

Deploy your Flue agent as a container. Zero infrastructure management, automatic scaling, pay-per-request.

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY server.js /app/
CMD ["node", "server.js"]
```

**Best for:** Getting started, stateless agents, API-style interactions.

**Deployed:** `flue-explorer-4vvob5m44q-uc.a.run.app` ✅

### 2. GEAP Agent Runtime — The Governed Path

Same agent, but deployed via Gemini Enterprise Agent Platform. Gets you SPIFFE identity, Agent Gateway integration, and Agent Registry discovery — out of the box.

**Key discovery:** GEAP Agent Runtime uses `sourceCodeSpec` + `imageSpec` for BYOC deployment (not `containerSpec`). Upload your Dockerfile + source as a tar.gz and GEAP builds it internally. Container must start within ~10 seconds.

**Best for:** Enterprise agents that need identity, governance, and audit trails.

**Deployed:** Reasoning Engine `7086641062818611200` ✅

### 3. GEAP Code Execution Sandbox — The Isolated Path

Run Python/JS code snippets in fully isolated sandboxes. 14-day state persistence, snapshots, no network by default.

**Key discovery:** The REST API uses a Chunk-based encoding — `input_data` is JSON-serialized, base64-encoded, and wrapped in a Chunk with `mimeType: application/json`. This is not documented in the discovery doc and was reverse-engineered from the Python SDK source.

**Best for:** Code interpretation, data analysis, untrusted code execution.

**E2E verified** ✅

### 4. GKE — The Custom Path

Full control over networking, scaling, and infrastructure. Deploy with standard Kubernetes manifests.

**Best for:** Multi-service architectures, GPU workloads, custom networking, on-prem connectivity.

### 5. GKE Agent Sandbox — The Secure Path

Kernel-level isolation via Kata Containers with GKE's Agent Sandbox CRDs. Sub-second provisioning, snapshots, declarative management.

**Best for:** Running untrusted agent-generated code with hardware-level isolation.

## Adding A2A: Agent-to-Agent Communication

We built a single-container agent that speaks both GEAP's query protocol AND the A2A protocol. One container, deployable anywhere:

- `GET /.well-known/agent-card.json` — A2A agent discovery
- `POST /message:send` — A2A messaging (JSON-RPC 2.0)
- `POST /api/reasoning_engine` — GEAP queries
- `GET /` — health checks

**Deployed:** `flue-a2a-agent-4vvob5m44q-uc.a.run.app` ✅

## The Security Layer

Across all deployment targets, Google Cloud's governance stack adds:

| Capability | What It Does |
|---|---|
| **Agent Identity** | SPIFFE-based X.509 identity for every agent |
| **Agent Gateway** | Policy enforcement for agent-to-tool/agent communication |
| **Agent Registry** | Centralized catalog for agent discovery |
| **Semantic Governance** | Natural language security policies |
| **Model Armor** | Prompt injection and data leakage protection |

## What We Learned

1. **GEAP BYOC works but the DX needs improvement.** It took 17 deployment attempts to get the BYOC contract right — undocumented API formats, premature operation timeouts, and silent failures. Once cracked, it's a 6-line Dockerfile.

2. **Fast startup is critical.** GEAP kills containers that don't start within ~10 seconds. Pre-build all dependencies in the Docker image — no runtime `npm install`.

3. **A2A + GEAP is powerful.** One container that speaks both protocols gives you enterprise governance (GEAP) and open interoperability (A2A).

4. **The governance stack is the differentiator.** E2B and Daytona have better DX for sandboxing. But GCP is the only platform where your agent gets identity, governance, and isolation out of the box.

## Try It

```bash
git clone https://github.com/zeroasterisk/flueframework-exploration
cd flueframework-exploration/08-a2a-integration

# Test locally
node server.js

# Deploy to Cloud Run
gcloud run deploy flue-a2a-agent --source=. --region=us-central1 --allow-unauthenticated
```

## Resources

- [Flue Framework](https://flueframework.com/)
- [Exploration repo](https://github.com/zeroasterisk/flueframework-exploration)
- [Security & Governance Guide](guides/security-and-governance.md)
- [GEAP Documentation](https://docs.cloud.google.com/gemini-enterprise-agent-platform)
- [A2A Protocol](https://google.github.io/A2A/)
- [Agent Gateway Codelab](https://codelabs.developers.google.com/cloudnet-agent-gateway)
