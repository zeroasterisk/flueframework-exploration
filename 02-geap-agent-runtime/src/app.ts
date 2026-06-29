import { flue } from '@flue/runtime/routing';
import { Hono } from 'hono';
import { createGeapAdapter } from './geap-adapter.ts';

/**
 * GEAP Agent Runtime BYOC container.
 *
 * Exposes both Flue agent routes (POST /agents/:name/:id) and the GEAP
 * Reasoning Engine protocol (POST /api/reasoning_engine). The GEAP adapter
 * bridges incoming queries to the Flue agent via internal HTTP on the same
 * port.
 */

const PORT = Number(process.env['PORT'] ?? 8080);

const app = new Hono();

// Health check — used by GEAP Agent Runtime for liveness/TCP probes
app.get('/health', (c) => c.json({ status: 'ok' }));

// Readiness check — GEAP uses this to determine if the agent can accept traffic
app.get('/ready', (c) => c.json({ status: 'ready' }));

// Mount Flue agent routes (POST /agents/:name/:id?wait=result)
app.route('/', flue());

// Mount GEAP Reasoning Engine protocol adapter
// Bridges POST /api/reasoning_engine → Flue agent HTTP API
const geap = createGeapAdapter({
	agentName: 'explorer',
	fluePort: PORT,
});
app.route('/', geap);

export default app;
