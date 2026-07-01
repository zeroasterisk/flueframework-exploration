# Tutorial: Add A2A to Your Flue Agent in 10 Minutes

> Make your Flue agent discoverable and interoperable with any A2A-compatible agent.

## What You'll Build

A Flue agent that:
- Serves an A2A Agent Card at `/.well-known/agent-card.json`
- Accepts A2A messages via `POST /message:send`
- Works alongside GEAP's query protocol

## Prerequisites

- Node.js 22+
- A Flue agent (or use our example)

## Step 1: Create the Server

Create `server.js`:

```javascript
const http = require('http');
const crypto = require('crypto');
const port = process.env.PORT || 8080;

// Your agent's identity
const AGENT = {
  name: 'My Flue Agent',
  description: 'A helpful assistant',
  version: '1.0.0',
};

// Your agent's logic (replace with your Flue agent)
function handleMessage(text) {
  return `You said: ${text}. I'm ${AGENT.name}!`;
}

// A2A Agent Card
function agentCard(baseUrl) {
  return {
    name: AGENT.name,
    description: AGENT.description,
    version: AGENT.version,
    protocolVersion: '1.0',
    url: baseUrl,
    defaultInputModes: ['text/plain'],
    defaultOutputModes: ['text/plain'],
    capabilities: { streaming: false, pushNotifications: false },
    skills: [],
  };
}

// A2A message handler
function handleA2A(body) {
  const parts = body?.params?.message?.parts || [];
  const text = parts.map(p => p.text || '').join(' ').trim() || '';
  return {
    jsonrpc: '2.0',
    id: body.id,
    result: {
      id: crypto.randomUUID(),
      status: { state: 'completed', timestamp: new Date().toISOString() },
      artifacts: [{
        artifactId: crypto.randomUUID(),
        parts: [{ kind: 'text', text: handleMessage(text) }],
      }],
    },
  };
}

// Server
http.createServer((req, res) => {
  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks).toString();
    const url = req.url || '/';

    // Health check
    if (req.method === 'GET' && url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ status: 'ok' }));
    }

    // A2A Agent Card
    if (req.method === 'GET' && url === '/.well-known/agent-card.json') {
      const proto = req.headers['x-forwarded-proto'] || 'http';
      const host = req.headers.host || `localhost:${port}`;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(agentCard(`${proto}://${host}`)));
    }

    // A2A message:send
    if (req.method === 'POST' && url === '/message:send') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(handleA2A(JSON.parse(body))));
    }

    res.writeHead(404);
    res.end();
  });
}).listen(port, () => console.log(`Listening on ${port}`));
```

## Step 2: Test Locally

```bash
node server.js &

# Check the Agent Card
curl http://localhost:8080/.well-known/agent-card.json | jq

# Send an A2A message
curl -X POST http://localhost:8080/message:send \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "1",
    "params": {
      "message": {
        "parts": [{"kind": "text", "text": "Hello!"}]
      }
    }
  }' | jq
```

## Step 3: Deploy

### Cloud Run (simplest)
```bash
echo 'FROM node:22-alpine
WORKDIR /app
COPY server.js .
CMD ["node", "server.js"]' > Dockerfile

gcloud run deploy my-a2a-agent --source=. --region=us-central1 --allow-unauthenticated
```

### GEAP Agent Runtime (governed)
```bash
tar czf /tmp/agent.tar.gz server.js Dockerfile
# Upload via sourceCodeSpec + imageSpec (see Exploration 02)
```

## Step 4: Register on AgentMsg (optional)

Make your agent discoverable via the [AgentMsg](https://agentmsg.net) relay:

```bash
curl -X POST https://agentmsg.net/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "urn:ai:yourdomain.com:ns:my-agent",
    "display_name": "My Flue Agent",
    "agent_card": {"name": "My Flue Agent", "url": "https://your-cloud-run-url"}
  }'
```

## What's Next

- Add tools to your agent (calculator, web search, etc.)
- Enable streaming with Server-Sent Events
- Add authentication via Agent Gateway
- Register in the Agent Registry for enterprise discovery

## Resources

- [A2A Protocol Specification](https://google.github.io/A2A/)
- [Flue Framework](https://flueframework.com/)
- [Full Exploration Repo](https://github.com/zeroasterisk/flueframework-exploration)
