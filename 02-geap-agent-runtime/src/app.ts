import { flue } from '@flue/runtime/routing';
import { Hono } from 'hono';

const app = new Hono();

// Health check — used by GEAP Agent Runtime for liveness probes
app.get('/health', (c) => c.json({ status: 'ok' }));

// Readiness check — GEAP uses this to determine if the agent can accept traffic
app.get('/ready', (c) => c.json({ status: 'ready' }));

// Mount Flue agent routes
app.route('/', flue());

export default app;
