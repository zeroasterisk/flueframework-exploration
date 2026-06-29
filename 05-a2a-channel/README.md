# Exploration 5: A2A Protocol Channel Adapter for Flue

This exploration makes a Flue agent A2A-compliant, so other agents can discover and communicate with it via the [A2A protocol](https://google.github.io/A2A/) (Agent-to-Agent, v1.0).

## How It Works

```
┌──────────────┐    A2A Protocol     ┌────────────────┐    Flue HTTP API     ┌─────────────┐
│  A2A Client  │ ──────────────────▶ │  A2A Adapter   │ ──────────────────▶  │ Flue Agent  │
│  (any agent) │    /message:send    │  (Hono routes)  │  /agents/:name/:id  │ (assistant)  │
└──────────────┘                     └────────────────┘    ?wait=result      └─────────────┘
```

1. **Agent Card Discovery**: `GET /.well-known/agent-card.json` returns an A2A-compliant Agent Card generated from the Flue agent's metadata.

2. **Message Flow**: When an A2A client sends `POST /message:send`, the adapter:
   - Extracts text content from A2A message parts
   - Creates a task ID (or reuses an existing one for multi-turn conversations)
   - Forwards the message to the Flue agent via `POST /agents/assistant/:taskId?wait=result`
   - Maps the Flue response back into an A2A `SendMessageResponse` with task status

3. **Task Tracking**: The adapter maintains an in-memory task store mapping A2A task IDs to Flue session IDs, with full message history.

## Architecture

```
src/
├── agents/
│   └── assistant.ts      # Flue agent definition (tools, profile, model)
├── a2a-types.ts           # A2A protocol types (self-contained)
├── a2a-adapter.ts         # A2A ↔ Flue bridge (Hono middleware)
└── app.ts                 # Wires Flue routes + A2A adapter together
```

- **`assistant.ts`** — Standard Flue agent with a calculator tool and a current-time tool.
- **`a2a-types.ts`** — Self-contained A2A protocol types (Agent Card, Task, Message, etc.).
- **`a2a-adapter.ts`** — Implements the A2A HTTP+JSON binding directly and bridges to the Flue agent via its HTTP API.
- **`app.ts`** — Mounts both `flue()` (standard agent routes) and the A2A adapter onto a single Hono server.

## Running

```bash
# Install dependencies
npm install

# Start the Flue dev server (port 1999 by default)
npm run dev

# In another terminal, test the A2A endpoints
./test.sh
```

## Testing with curl

### 1. Discover the Agent Card

```bash
curl -s http://localhost:1999/.well-known/agent-card.json | jq .
```

### 2. Send a Message (Blocking)

```bash
curl -s -X POST http://localhost:1999/message:send \
  -H 'Content-Type: application/json' \
  -d '{
    "message": {
      "messageId": "msg-001",
      "role": "ROLE_USER",
      "parts": [{ "text": "What is 42 times 17?" }]
    }
  }' | jq .
```

### 3. Send a Message to an Existing Task (Multi-turn)

```bash
# Use the taskId from the previous response
curl -s -X POST http://localhost:1999/message:send \
  -H 'Content-Type: application/json' \
  -d '{
    "message": {
      "messageId": "msg-002",
      "role": "ROLE_USER",
      "taskId": "TASK_ID_FROM_PREVIOUS_RESPONSE",
      "parts": [{ "text": "Now divide that result by 3" }]
    }
  }' | jq .
```

### 4. Get Task Status

```bash
curl -s http://localhost:1999/tasks/TASK_ID | jq .
```

### 5. Attempt Streaming (Returns UnsupportedOperationError)

```bash
curl -s -X POST http://localhost:1999/message:stream \
  -H 'Content-Type: application/json' \
  -d '{
    "message": {
      "messageId": "msg-003",
      "role": "ROLE_USER",
      "parts": [{ "text": "Hello" }]
    }
  }' | jq .
```

## Deploying Alongside Explorations 1-4

This exploration uses the same Flue agent patterns as explorations 01 and 02:

- **Cloud Run (01)**: Deploy as a Cloud Run service. Set `BASE_URL` to the Cloud Run service URL. The A2A adapter and Flue agent run in the same container.
- **GEAP Agent Runtime (02)**: The A2A adapter mounts alongside the standard Flue routes, so it works with any Flue deployment target.
- **GEAP Sandbox (03, 04)**: The agent definition uses `local()` sandbox; swap to `isolate()` for sandboxed environments.

The key change for production: replace the in-memory task store with a persistent store (e.g., Cloud Firestore) and configure proper authentication via the `authenticate` callback on the A2A channel.

## What's Supported vs. Not

### Supported (v1)
- ✅ Agent Card discovery (`/.well-known/agent-card.json`)
- ✅ `POST /message:send` — synchronous (blocking) message handling
- ✅ `GET /tasks/:id` — task status retrieval with history
- ✅ Multi-turn conversations (reuse task ID)
- ✅ Text parts in messages
- ✅ Task artifacts in responses
- ✅ A2A error format (`google.rpc.Status`)

### Not Supported (Future)
- ❌ `POST /message:stream` — streaming responses (SSE) — returns `UnsupportedOperationError`
- ❌ `POST /tasks/:id:cancel` — task cancellation (stub)
- ❌ Push notifications
- ❌ Authentication/security schemes
- ❌ Extended Agent Card
- ❌ Non-text parts (images, data, URLs)
- ❌ Persistent task store (in-memory only)

## A2A Protocol Reference

- [A2A Specification](https://google.github.io/A2A/)
- [Flue Agent Building Guide](https://flueframework.com/docs/guide/building-agents/)
- [Flue A2A Channel Package](../../flue/packages/a2a/) (reference implementation)
