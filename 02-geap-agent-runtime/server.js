/**
 * Lightweight GEAP-compatible server for a Flue agent.
 *
 * GEAP Agent Runtime contract (reverse-engineered):
 * - Listen on PORT env var (default 8080)
 * - Respond to POST /api/reasoning_engine with JSON {output: ...}
 * - Start within ~10 seconds
 * - GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_LOCATION are auto-injected
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

// Handle GEAP reasoning engine queries
function handleQuery(input) {
  const message = input.message || input.newMessage || '';

  // Simple keyword-based routing (in production, this would call the LLM)
  if (/calc|math|compute|\d+\s*[\+\-\*\/]/i.test(message)) {
    const match = message.match(/[\d\.\s\+\-\*\/\(\)\%\^]+/);
    if (match) {
      const result = calculate(match[0].trim());
      return `Calculator result: ${result.result || result.error}`;
    }
  }

  return `Hello! I'm Explorer, a Flue agent running on GEAP Agent Runtime. ` +
    `I have a calculator tool. Try asking me to calculate something! ` +
    `(Environment: ${process.env.K_SERVICE || 'local'}, ` +
    `Project: ${process.env.GOOGLE_CLOUD_PROJECT || 'unknown'})`;
}

const server = http.createServer((req, res) => {
  const body = [];
  req.on('data', chunk => body.push(chunk));
  req.on('end', () => {
    const bodyStr = Buffer.concat(body).toString();

    // Health check
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    // GEAP reasoning engine query
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
  console.log(`Flue Explorer (GEAP) listening on 0.0.0.0:${port}`);
});
