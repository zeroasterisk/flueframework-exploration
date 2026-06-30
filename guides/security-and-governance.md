# Securing Flue Agents on Google Cloud

> A workbook-style guide to connecting and securing Flue agents across Google Cloud deployment targets, covering Agent Gateway, Agent Identity, Agent Registry, and security policies.

## Overview

This guide walks through securing a Flue agent deployed on Google Cloud using the Gemini Enterprise Agent Platform (GEAP) governance stack. The same agent can be deployed to Cloud Run, GEAP Agent Runtime, or GKE — the governance layer applies across all deployment targets.

**Based on:**
- [Governing agentic workloads with Agent Gateway](https://codelabs.developers.google.com/cloudnet-agent-gateway)
- [Secure agentic coding](https://codelabs.developers.google.com/secure-agentic-coding)

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   GEAP Governance Layer                    │
│                                                           │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │   Agent      │  │   Agent      │  │   Agent        │  │
│  │   Identity   │  │   Gateway    │  │   Registry     │  │
│  │  (SPIFFE)    │  │  (IAP+IAM)  │  │  (Catalog)     │  │
│  └──────┬──────┘  └──────┬───────┘  └───────┬────────┘  │
│         │                │                    │           │
└─────────┼────────────────┼────────────────────┼───────────┘
          │                │                    │
    ┌─────┴────┐    ┌──────┴──────┐     ┌──────┴──────┐
    │ Cloud Run│    │GEAP Runtime │     │    GKE      │
    │ (01)     │    │   (02)      │     │  (06/07)    │
    └──────────┘    └─────────────┘     └─────────────┘
```

## Step 1: Agent Identity

Every Flue agent on Google Cloud gets a unique identity via SPIFFE.

### What You Get
- **X.509 certificate** — automatically provisioned, cryptographically bound
- **SPIFFE ID** — e.g., `spiffe://alanblount-demo.svc.id.goog/ns/default/sa/flue-explorer`
- **No service account keys** — identities can't be impersonated
- **mTLS** — agent-to-agent communication is encrypted and authenticated

### How to Enable

**On GEAP Agent Runtime (Exploration 02):**
Agent Identity is automatically provisioned when you deploy a Reasoning Engine. The `GOOGLE_CLOUD_AGENT_ENGINE_ID` environment variable identifies the agent.

**On Cloud Run (Exploration 01):**
```bash
# Create a dedicated service account for the agent
gcloud iam service-accounts create flue-explorer-sa \
  --display-name="Flue Explorer Agent"

# Deploy with the dedicated SA
gcloud run deploy flue-explorer \
  --service-account=flue-explorer-sa@PROJECT.iam.gserviceaccount.com \
  --region=us-central1
```

**On GKE (Exploration 06):**
```yaml
# k8s/service-account.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: flue-explorer
  annotations:
    iam.gke.io/gcp-service-account: flue-explorer-sa@PROJECT.iam.gserviceaccount.com
```

## Step 2: Agent Registry

Register your Flue agent so other agents and services can discover it.

### Register via CLI
```bash
gcloud agent-registry agents create flue-explorer \
  --project=PROJECT \
  --location=us-central1 \
  --display-name="Flue Explorer Agent" \
  --description="Calculator agent deployed via Flue framework" \
  --agent-card-uri="https://flue-explorer-URL/.well-known/agent-card.json"
```

### Register via A2A Agent Card
If your Flue agent has the A2A adapter (Exploration 05), it automatically serves an Agent Card at `/.well-known/agent-card.json`. Register this URL in the Agent Registry.

## Step 3: Agent Gateway

Agent Gateway is the policy enforcement point for all agent-to-tool and agent-to-agent communication.

### Two Modes

| Mode | Direction | Use Case |
|---|---|---|
| **Client-to-Agent** | Inbound | Users/apps calling your agent |
| **Agent-to-Anywhere** | Outbound (egress) | Your agent calling tools, APIs, other agents |

### Set Up Agent-to-Anywhere (Egress)

This is the most common pattern — your Flue agent needs to call external tools (Vertex AI, MCP servers, other agents).

```bash
# 1. Create an Agent Gateway
gcloud agent-gateways create flue-gateway \
  --project=PROJECT \
  --location=us-central1 \
  --governed-access-path=AGENT_TO_ANYWHERE

# 2. Register the tools/endpoints the agent is allowed to call
gcloud agent-registry endpoints create vertex-ai \
  --project=PROJECT \
  --location=us-central1 \
  --uri="https://us-central1-aiplatform.googleapis.com"

# 3. Grant the agent permission to call through the gateway
gcloud projects add-iam-policy-binding PROJECT \
  --member="principal://iam.googleapis.com/projects/PROJECT_NUM/locations/global/workloadIdentityPools/PROJECT.svc.id.goog/subject/ns/default/sa/flue-explorer" \
  --role="roles/iap.egressor"
```

### Dry-Run Mode
Start in dry-run to validate policies without blocking traffic:
```bash
gcloud agent-gateways update flue-gateway \
  --enforcement-mode=DRY_RUN
```

## Step 4: Security Policies

### IAM Policies
Control which agents can call which tools:
```bash
# Allow flue-explorer to call Vertex AI
gcloud agent-registry endpoints add-iam-policy-binding vertex-ai \
  --member="principal://..." \
  --role="roles/iap.egressor"
```

### Semantic Governance Policies
Define security rules in natural language:
```
"The agent must not share customer financial data with external APIs"
"The agent must verify user consent before processing personal information"
"API calls to payment endpoints require supervisor approval"
```

### Model Armor
Protect against prompt injection and data leakage:
- Content sanitization on inputs and outputs
- Integrated via Service Extensions
- Configurable sensitivity levels

## Step 5: Deployment-Specific Security

### Cloud Run (Exploration 01)
- IAM-based auth (`--allow-unauthenticated` or service-to-service)
- VPC connector for private networking
- Secret Manager for API keys

### GEAP Agent Runtime (Exploration 02)
- Automatic Agent Identity (SPIFFE)
- Built-in Agent Gateway integration
- Reserved env vars auto-injected
- No ambient credentials in container

### GKE (Exploration 06)
- Workload Identity Federation for GCP access
- Network Policies for pod-level isolation
- GKE Sandbox (gVisor) for kernel-level isolation

### GKE Agent Sandbox (Exploration 07)
- Kata Containers for hardware-level isolation
- SandboxTemplate/SandboxClaim CRDs
- Sub-second provisioning
- Snapshot/restore for state management

## Value Proposition: Why GCP for Flue Agents

| Capability | GCP | Other Clouds | Self-Hosted |
|---|---|---|---|
| Agent Identity (SPIFFE) | ✅ Native | ❌ Manual | ❌ Manual |
| Agent Gateway (policy enforcement) | ✅ Managed | ❌ Build your own | ❌ Build your own |
| Agent Registry (discovery) | ✅ Managed | ❌ Build your own | ❌ Build your own |
| Semantic Governance | ✅ Natural language policies | ❌ | ❌ |
| Model Armor | ✅ Built-in | ❌ | ❌ |
| Sub-second Sandbox | ✅ GEAP + GKE Agent Sandbox | ❌ | ❌ |
| A2A Protocol | ✅ Native in ADK + Agent Runtime | Partial | Manual |
| Deployment Options | Cloud Run, GEAP Runtime, GKE | Varies | Docker/K8s |

**Bottom line:** GCP is the only platform where a Flue agent gets identity, governance, and isolation out of the box. Other platforms require building these capabilities yourself.

## Resources

- [Agent Gateway Codelab](https://codelabs.developers.google.com/cloudnet-agent-gateway)
- [Secure Agentic Coding Codelab](https://codelabs.developers.google.com/secure-agentic-coding)
- [Agent Identity Documentation](https://docs.cloud.google.com/iam/docs/agent-identity-overview)
- [Agent Gateway Documentation](https://docs.cloud.google.com/gemini-enterprise-agent-platform/govern/gateways/agent-gateway-overview)
- [Agent Registry Documentation](https://docs.cloud.google.com/gemini-enterprise-agent-platform/govern)
- [GKE Agent Sandbox](https://docs.cloud.google.com/kubernetes-engine/docs/concepts/machine-learning/agent-sandbox)
