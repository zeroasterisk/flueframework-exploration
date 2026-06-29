# Flue Framework Exploration

Exploring deployment patterns for [Flue](https://flueframework.com/) agents across Google Cloud infrastructure and A2A protocol integration.

## Explorations

| # | Path | Description | Status |
|---|---|---|---|
| 1 | [`01-cloud-run/`](01-cloud-run/) | Deploy Flue agent as BYOC on Cloud Run | 🔬 In progress |
| 2 | [`02-geap-agent-runtime/`](02-geap-agent-runtime/) | Deploy Flue agent as BYOC on GEAP Agent Runtime | 🔬 In progress |
| 3 | [`03-geap-sandbox-script/`](03-geap-sandbox-script/) | Deploy as GEAP sandbox (normal container, script-only access) | 🔬 In progress |
| 4 | [`04-geap-sandbox-byoc/`](04-geap-sandbox-byoc/) | Deploy as GEAP sandbox (BYOC, full bash access) | 🔬 In progress |
| 5 | [`05-a2a-channel/`](05-a2a-channel/) | A2A protocol channel adapter for Flue agents | 🔬 In progress |

## Context

- **Flue**: TypeScript agent harness framework — [flueframework.com](https://flueframework.com/)
- **GEAP**: Gemini Enterprise Agent Platform — [docs](https://docs.cloud.google.com/gemini-enterprise-agent-platform)
- **A2A**: Agent-to-Agent protocol — [spec](https://google.github.io/A2A/)
- **GCP Project**: `alanblount-demo` (us-central1)

## Prerequisites

- Node.js 22+
- `pnpm` package manager
- Google Cloud SDK (`gcloud`) authenticated
- Docker (for BYOC builds)

## Quick Start

```bash
# Install Flue CLI
pnpm create flue@latest

# Create a basic agent
cd 01-cloud-run
pnpm install
pnpm dev
```
