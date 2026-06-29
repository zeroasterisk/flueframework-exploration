/**
 * GEAP Agent Runtime protocol adapter for Flue agents.
 *
 * GEAP (Google Enterprise Agent Platform) forwards queries to BYOC containers
 * via POST /api/reasoning_engine. This adapter bridges that protocol to a Flue
 * agent's HTTP API.
 *
 * Protocol reference:
 *   Request:  { class_method?: string, input?: Record<string, any> }
 *   Response: { output: any }
 *
 * The ADK Python source (google/adk-python, cli/fast_api.py) defines the
 * canonical server; this adapter implements the container side in TypeScript.
 */

import { Hono } from 'hono';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Incoming GEAP reasoning engine request. */
interface GeapQueryRequest {
	class_method?: string;
	input?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface GeapAdapterOptions {
	/** Flue agent module name (matches the filename in src/agents/). */
	agentName: string;
	/** Port the Flue server listens on (same process, default 8080). */
	fluePort?: number;
}

// ---------------------------------------------------------------------------
// Adapter factory
// ---------------------------------------------------------------------------

/**
 * Creates a Hono sub-app with GEAP Reasoning Engine endpoints that bridge
 * to a Flue agent via its HTTP API (POST /agents/:name/:id?wait=result).
 *
 * Routes:
 * - POST /api/reasoning_engine       — non-streaming query
 * - POST /api/stream_reasoning_engine — streaming query (stub, returns non-streaming)
 */
export function createGeapAdapter(options: GeapAdapterOptions): Hono {
	const { agentName } = options;
	const fluePort = options.fluePort ?? 8080;
	const flueBaseUrl = `http://localhost:${String(fluePort)}`;

	const app = new Hono();

	// -------------------------------------------------------------------
	// POST /api/reasoning_engine — non-streaming GEAP query
	// -------------------------------------------------------------------
	app.post('/api/reasoning_engine', async (c) => {
		let body: GeapQueryRequest;
		try {
			body = await c.req.json<GeapQueryRequest>();
		} catch {
			return c.json({ output: 'Invalid JSON body.' }, 400);
		}

		const classMethod = body.class_method ?? 'query';
		const input = body.input ?? {};

		// Route by class_method
		switch (classMethod) {
			case 'query':
			case 'async_stream_query':
			case 'stream_query':
				return await handleQuery(c, agentName, flueBaseUrl, input);

			case 'create_session':
			case 'async_create_session':
				return c.json({
					output: {
						session_id: input['session_id'] ?? crypto.randomUUID(),
						user_id: input['user_id'] ?? 'default',
					},
				});

			case 'list_sessions':
			case 'async_list_sessions':
				return c.json({ output: [] });

			case 'get_session':
			case 'async_get_session':
				return c.json({
					output: {
						session_id: input['session_id'] ?? 'unknown',
						user_id: input['user_id'] ?? 'default',
						state: {},
					},
				});

			case 'delete_session':
			case 'async_delete_session':
				return c.json({ output: null });

			default:
				return c.json(
					{ output: `Unknown class_method: ${classMethod}` },
					400,
				);
		}
	});

	// -------------------------------------------------------------------
	// POST /api/stream_reasoning_engine — streaming variant
	// Falls back to non-streaming for now.
	// -------------------------------------------------------------------
	app.post('/api/stream_reasoning_engine', async (c) => {
		let body: GeapQueryRequest;
		try {
			body = await c.req.json<GeapQueryRequest>();
		} catch {
			return c.json({ output: 'Invalid JSON body.' }, 400);
		}

		const classMethod = body.class_method ?? 'query';
		const input = body.input ?? {};

		// For streaming, handle the query and return as newline-delimited JSON
		if (
			classMethod === 'query' ||
			classMethod === 'async_stream_query' ||
			classMethod === 'stream_query'
		) {
			const result = await queryFlueAgent(agentName, flueBaseUrl, input);
			if (!result.ok) {
				const chunk = JSON.stringify({ output: result.error }) + '\n';
				return new Response(chunk, {
					status: 502,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			const chunk = JSON.stringify({ output: result.text }) + '\n';
			return new Response(chunk, {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// Fallback: treat as non-streaming
		return c.json(
			{ output: `Streaming not supported for class_method: ${classMethod}` },
			400,
		);
	});

	return app;
}

// ---------------------------------------------------------------------------
// Query handler
// ---------------------------------------------------------------------------

async function handleQuery(
	c: { json: (data: unknown, status?: number) => Response },
	agentName: string,
	flueBaseUrl: string,
	input: Record<string, unknown>,
): Promise<Response> {
	const result = await queryFlueAgent(agentName, flueBaseUrl, input);
	if (!result.ok) {
		return c.json({ output: result.error }, 502);
	}
	return c.json({ output: result.text });
}

// ---------------------------------------------------------------------------
// Flue agent bridge
// ---------------------------------------------------------------------------

type QueryResult =
	| { ok: true; text: string }
	| { ok: false; error: string };

async function queryFlueAgent(
	agentName: string,
	flueBaseUrl: string,
	input: Record<string, unknown>,
): Promise<QueryResult> {
	// Extract prompt — GEAP sends as `prompt` (per our classMethodSpecs) or
	// `message` (ADK convention).
	const prompt =
		(input['prompt'] as string | undefined) ??
		(input['message'] as string | undefined);

	if (!prompt || typeof prompt !== 'string') {
		return {
			ok: false,
			error: 'Missing "prompt" or "message" in input.',
		};
	}

	// Use provided session_id or generate one
	const sessionId =
		(input['session_id'] as string | undefined) ?? crypto.randomUUID();

	try {
		// Bridge to Flue: POST /agents/:name/:id?wait=result
		const flueUrl = `${flueBaseUrl}/agents/${agentName}/${sessionId}?wait=result`;
		const response = await fetch(flueUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ message: prompt }),
		});

		if (!response.ok) {
			const errorText = await response.text();
			return {
				ok: false,
				error: `Flue agent error (${String(response.status)}): ${errorText}`,
			};
		}

		const responseText = await response.text();
		return { ok: true, text: extractAgentText(responseText) };
	} catch (err) {
		const detail = err instanceof Error ? err.message : 'Unknown error';
		return { ok: false, error: `Failed to reach Flue agent: ${detail}` };
	}
}

// ---------------------------------------------------------------------------
// Response parsing — extract assistant text from Flue's response format
// ---------------------------------------------------------------------------

/**
 * Extract the assistant's text from a Flue ?wait=result response.
 *
 * The response may be:
 * 1. A simple JSON object with a `text` or `message` field
 * 2. A newline-delimited JSON event stream (Durable Streams format)
 */
function extractAgentText(responseBody: string): string {
	// Try simple JSON first
	try {
		const json = JSON.parse(responseBody) as Record<string, unknown>;
		if (typeof json['text'] === 'string') return json['text'] as string;
		if (typeof json['message'] === 'string') return json['message'] as string;
		// If it's an object with output, unwrap it
		if (typeof json['output'] === 'string') return json['output'] as string;
	} catch {
		// Not simple JSON — try event stream
	}

	// Parse newline-delimited JSON events
	const lines = responseBody
		.split('\n')
		.filter((line) => line.trim().length > 0);
	const textParts: string[] = [];

	for (const line of lines) {
		try {
			const event = JSON.parse(line) as Record<string, unknown>;
			const data = (event['data'] ?? event) as Record<string, unknown>;

			if (typeof data['text'] === 'string') {
				textParts.push(data['text'] as string);
			} else if (
				data['type'] === 'text' &&
				typeof data['content'] === 'string'
			) {
				textParts.push(data['content'] as string);
			} else if (
				data['type'] === 'assistant' &&
				Array.isArray(data['content'])
			) {
				for (const part of data['content'] as Array<
					Record<string, unknown>
				>) {
					if (
						part['type'] === 'text' &&
						typeof part['text'] === 'string'
					) {
						textParts.push(part['text'] as string);
					}
				}
			}
		} catch {
			// Skip non-JSON lines
		}
	}

	if (textParts.length > 0) {
		return textParts.join('\n');
	}

	// Fallback: return raw body
	return responseBody;
}
