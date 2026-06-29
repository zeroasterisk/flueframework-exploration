# Exploration 1: Flue Agent on Google Cloud Run

A minimal Flue agent deployed as a BYOC (Bring Your Own Container) service on Google Cloud Run.

## What This Does

Deploys **Explorer**, a Flue agent with a calculator tool, as a containerized Node.js service on Cloud Run. The agent:

- Is defined with `defineAgent()` and `defineAgentProfile()`
- Has a `calculator` tool that evaluates arithmetic expressions
- Uses the `local()` sandbox for shell/filesystem access
- Exposes Flue's standard HTTP API (agent dispatch, streaming, conversations)
- Includes a `/health` endpoint for Cloud Run health checks

## Project Structure

```
01-cloud-run/
├── src/
│   ├── agents/explorer.ts   # Agent definition with calculator tool
│   └── app.ts               # Hono app with flue() routing + health check
├── flue.config.ts            # Build config (target: node)
├── AGENTS.md                 # Agent system instructions
├── Dockerfile                # Multi-stage build for Cloud Run
├── cloudbuild.yaml           # Google Cloud Build config
├── deploy.sh                 # Manual deploy script
├── package.json
└── tsconfig.json
```

## Local Development

```bash
# Install dependencies
pnpm install

# Start dev server (port 3583 by default)
pnpm dev

# Interact with the agent
curl -X POST http://localhost:3583/agents/explorer/my-instance \
  -H 'Content-Type: application/json' \
  -d '{"prompt": "What is 144 * 12?"}'
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude model access |
| `PORT` | No | HTTP port (defaults to 3000 locally, set to 8080 in Dockerfile) |

## Build & Deploy to Cloud Run

### Option A: Cloud Build (recommended)

```bash
gcloud builds submit \
  --config cloudbuild.yaml \
  --substitutions _ANTHROPIC_API_KEY=sk-ant-...
```

### Option B: Manual deploy

```bash
export GCP_PROJECT_ID=my-project
export ANTHROPIC_API_KEY=sk-ant-...
./deploy.sh
```

### Option C: Step by step

```bash
# Build
docker build -t gcr.io/MY_PROJECT/flue-explorer .

# Test locally
docker run -p 8080:8080 -e ANTHROPIC_API_KEY=sk-ant-... gcr.io/MY_PROJECT/flue-explorer

# Push & deploy
docker push gcr.io/MY_PROJECT/flue-explorer
gcloud run deploy flue-explorer \
  --image gcr.io/MY_PROJECT/flue-explorer \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars ANTHROPIC_API_KEY=sk-ant-...
```

## Testing the Deployed Agent

```bash
SERVICE_URL=$(gcloud run services describe flue-explorer --region us-central1 --format 'value(status.url)')

# Health check
curl $SERVICE_URL/health

# Send a prompt
curl -X POST $SERVICE_URL/agents/explorer/test-session \
  -H 'Content-Type: application/json' \
  -d '{"prompt": "Use the calculator to compute 2^10"}'
```
