/**
 * Flue agent with A2A protocol support on Google Cloud.
 * 
 * Combines:
 * - GEAP compatibility (POST /api/reasoning_engine → {output: ...})
 * - A2A protocol (/.well-known/agent-card.json, /message:send)
 * - Cloud Run / GKE health checks (GET / → 200)
 *
 * Works on: Cloud Run, GEAP Agent Runtime, GKE
 */
const http = require('http');
const crypto = require('crypto');
const port = process.env.PORT || 8080;

// ── Agent Definition ─────────────────────────────────────────────
const AGENT = {
  name: 'Flue Explorer',
  description: 'Calculator agent deployed via Flue framework on Google Cloud.',
  version: '1.0.0',
  model: process.env.FLUE_MODEL || 'gemini-3.1-flash-lite',
};

// ── Calculator Tool ──────────────────────────────────────────────
function calculate(expression) {
  try {
    const result = Function('"use strict"; return (' + expression + ')')();
    return { status: 'success', result: String(result) };
  } catch (e) {
    return { status: 'error', error: String(e) };
  }
}

function handleMessage(message) {
  if (/calc|math|compute|\d+\s*[\+\-\*\/]/i.test(message)) {
    const match = message.match(/[\d\.\s\+\-\*\/\(\)\%\^]+/);
    if (match) {
      const result = calculate(match[0].trim());
      return `Calculator result: ${result.result || result.error}`;
    }
  }
  return `Hello! I'm ${AGENT.name}, running on Google Cloud. ` +
    `I can do calculations — try "calculate 42 * 17". ` +
    `Environment: ${process.env.K_SERVICE || 'local'}`;
}

// ── A2A Agent Card ───────────────────────────────────────────────
function agentCard(baseUrl) {
  return {
    name: AGENT.name,
    description: AGENT.description,
    version: AGENT.version,
    protocolVersion: '1.0',
    url: baseUrl + '/a2a',
    defaultInputModes: ['text/plain'],
    defaultOutputModes: ['text/plain'],
    capabilities: { streaming: false, pushNotifications: false },
    skills: [{
      id: 'calculator',
      name: 'Calculator',
      description: 'Evaluate mathematical expressions',
    }],
  };
}

// ── A2A Message Handler ──────────────────────────────────────────
function handleA2AMessage(body) {
  const params = body.params || {};
  const msg = params.message || {};
  const parts = msg.parts || [];
  const text = parts.map(p => p.text || '').join(' ').trim() || 'Hello';
  
  const taskId = crypto.randomUUID();
  const responseText = handleMessage(text);

  return {
    jsonrpc: '2.0',
    id: body.id,
    result: {
      id: taskId,
      status: { state: 'completed', timestamp: new Date().toISOString() },
      artifacts: [{
        artifactId: crypto.randomUUID(),
        parts: [{ kind: 'text', text: responseText }],
      }],
    },
  };
}

// ── HTTP Server ──────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks).toString();
    const url = req.url || '/';

    // Health check
    if (req.method === 'GET' && (url === '/' || url === '/health')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', agent: AGENT.name }));
      return;
    }

    // A2A Agent Card
    if (req.method === 'GET' && url === '/.well-known/agent-card.json') {
      const proto = req.headers['x-forwarded-proto'] || 'http';
      const host = req.headers['host'] || 'localhost:' + port;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(agentCard(`${proto}://${host}`)));
      return;
    }

    // Parse body for POST routes
    let parsed = {};
    try { parsed = body ? JSON.parse(body) : {}; } catch {}

    // A2A message:send
    if (req.method === 'POST' && url === '/message:send') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(handleA2AMessage(parsed)));
      return;
    }

    // GEAP reasoning engine query
    if (req.method === 'POST' && (url === '/api/reasoning_engine' || url === '/')) {
      const input = parsed.input || parsed;
      const message = input.message || input.newMessage || JSON.stringify(input);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ output: handleMessage(message) }));
      return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found', path: url }));
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`${AGENT.name} listening on 0.0.0.0:${port}`);
  console.log(`  A2A card: http://0.0.0.0:${port}/.well-known/agent-card.json`);
  console.log(`  GEAP:     POST http://0.0.0.0:${port}/api/reasoning_engine`);
  console.log(`  A2A:      POST http://0.0.0.0:${port}/message:send`);
});
