# Exploration 08: A2A-Integrated Flue Agent

A single Flue agent that speaks **both** the GEAP Reasoning Engine protocol and the A2A protocol. Deployable to Cloud Run, GEAP Agent Runtime, or GKE with the same container.

## Endpoints

| Endpoint | Method | Protocol | Description |
|---|---|---|---|
| `/` | GET | Health | Health check |
| `/.well-known/agent-card.json` | GET | A2A | Agent discovery card |
| `/message:send` | POST | A2A | Send a message (JSON-RPC 2.0) |
| `/api/reasoning_engine` | POST | GEAP | Reasoning engine query |

## How It Works

The server handles multiple protocols simultaneously:
- **A2A clients** discover the agent via the Agent Card and communicate via `message:send`
- **GEAP Agent Runtime** forwards queries to `/api/reasoning_engine`
- **Health checks** from Cloud Run, GKE, or GEAP all hit `GET /`

## Deploy

### Cloud Run
```bash
gcloud run deploy flue-a2a-agent \
  --source=. \
  --region=us-central1 \
  --allow-unauthenticated
```

### GEAP Agent Runtime
Use `sourceCodeSpec` + `imageSpec` deployment (see Exploration 02).

### GKE
Apply the Kubernetes manifests from Exploration 06.

## Test

```bash
# Health check
curl http://localhost:8080/

# A2A Agent Card
curl http://localhost:8080/.well-known/agent-card.json

# A2A message
curl -X POST http://localhost:8080/message:send \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"1","method":"message/send","params":{"message":{"parts":[{"kind":"text","text":"Calculate 42 * 17"}]}}}'

# GEAP query
curl -X POST http://localhost:8080/api/reasoning_engine \
  -H "Content-Type: application/json" \
  -d '{"input":{"message":"Calculate 42 * 17"}}'
```
