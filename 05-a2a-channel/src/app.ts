import { flue } from '@flue/runtime/routing';
import { Hono } from 'hono';
import { createA2AAdapter } from './a2a-adapter.ts';

/**
 * The Flue dev server runs on port 1999 by default.
 * Both Flue agent routes and A2A routes are mounted on the same app.
 * The A2A adapter bridges to the Flue agent via internal HTTP requests
 * to localhost on the same port.
 */
const PORT = 1999;
const BASE_URL = process.env['BASE_URL'] ?? `http://localhost:${String(PORT)}`;

const app = new Hono();

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// Mount Flue agent routes (standard Flue HTTP API at /agents/:name/:id)
app.route('/', flue());

// Mount A2A protocol routes alongside Flue routes
const a2a = createA2AAdapter({
	agentName: 'assistant',
	baseUrl: BASE_URL,
	fluePort: PORT,
	card: {
		name: 'Flue Assistant',
		description:
			'A helpful AI assistant powered by Flue, accessible via the A2A protocol. ' +
			'Can perform calculations and check the current time.',
		version: '1.0.0',
		skills: [
			{
				id: 'general-assistance',
				name: 'General Assistance',
				description: 'Answer questions and have conversations on any topic.',
				tags: ['general', 'conversation', 'qa'],
				examples: ['What is the capital of France?', 'Explain quantum computing simply.'],
			},
			{
				id: 'calculator',
				name: 'Calculator',
				description: 'Evaluate mathematical expressions and perform calculations.',
				tags: ['math', 'calculator', 'arithmetic'],
				examples: ['What is 42 * 17?', 'Calculate the square root of 144.'],
			},
			{
				id: 'current-time',
				name: 'Current Time',
				description: 'Get the current date and time.',
				tags: ['time', 'date', 'clock'],
				examples: ['What time is it?', 'What is the current date?'],
			},
		],
	},
});
app.route('/', a2a);

export default app;
