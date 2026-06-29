import { flue } from '@flue/runtime/routing';
import { Hono } from 'hono';

const app = new Hono();

// Health check for Cloud Run
app.get('/health', (c) => c.json({ status: 'ok' }));

// Mount Flue agent routes
app.route('/', flue());

export default app;
