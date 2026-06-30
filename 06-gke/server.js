/**
 * Lightweight HTTP server for a Flue agent on GKE.
 *
 * Same agent as 02-geap-agent-runtime but deployed to a GKE cluster
 * instead of GEAP Agent Runtime. The server:
 * - Listens on PORT env var (default 8080)
 * - Responds to GET / with health status (used by k8s liveness probe)
 * - Responds to GET /ready with readiness status
 * - Responds to POST / with agent query results
 * - GOOGLE_CLOUD_PROJECT and FLUE_MODEL are injected via ConfigMap
 */
const http = require('http');
const port = process.env.PORT || 8080;

// Simple calculator function (mirrors the Flue agent's tool)
function calculate(expression) {
  try {
    return { status: 'success', result: String(Function('"use strict"; return (' + expression + ')')()) };
  } catch (e) {
    return { status: 'error', error: String(e) };
  }
}

// Handle agent queries
function handleQuery(input) {
  const message = input.message || input.newMessage || input.prompt || '';

  // Simple keyword-based routing (in production, this would call the LLM)
  if (/calc|math|compute|\d+\s*[\+\-\*\/]/i.test(message)) {
    const match = message.match(/[\d\.\s\+\-\*\/\(\)\%\^]+/);
    if (match) {
      const result = calculate(match[0].trim());
      return `Calculator result: ${result.result || result.error}`;
    }
  }

  return `Hello! I'm Explorer, a Flue agent running on GKE. ` +
    `I have a calculator tool. Try asking me to calculate something! ` +
    `(Pod: ${process.env.HOSTNAME || 'unknown'}, ` +
    `Project: ${process.env.GOOGLE_CLOUD_PROJECT || 'unknown'}, ` +
    `Model: ${process.env.FLUE_MODEL || 'not-set'})`;
}

const server = http.createServer((req, res) => {
  const body = [];
  req.on('data', chunk => body.push(chunk));
  req.on('end', () => {
    const bodyStr = Buffer.concat(body).toString();

    // Health / liveness probe
    if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    // Readiness probe
    if (req.method === 'GET' && req.url === '/ready') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ready' }));
      return;
    }

    // Agent query
    if (req.method === 'POST') {
      try {
        const parsed = bodyStr ? JSON.parse(bodyStr) : {};
        const input = parsed.input || parsed;
        const output = handleQuery(input);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ output }));
      } catch (e) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ output: `Error: ${e.message}` }));
      }
      return;
    }

    res.writeHead(404);
    res.end();
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Flue Explorer (GKE) listening on 0.0.0.0:${port}`);
});
