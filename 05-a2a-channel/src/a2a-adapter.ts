/**
 * A2A protocol adapter for Flue agents.
 *
 * Creates Hono routes that expose a Flue agent over the A2A protocol
 * (Agent-to-Agent, v1.0). Self-contained — implements the A2A HTTP+JSON
 * binding directly and bridges messages to a Flue agent via its HTTP API.
 *
 * @see https://google.github.io/A2A/
 */

import { Hono } from 'hono';
import type {
	A2AAgentCard,
	A2AAgentSkill,
	A2AArtifact,
	A2AMessage,
	A2ARpcStatus,
	A2ASendMessageRequest,
	A2ASendMessageResponse,
	A2ATask,
	A2ATaskState,
} from './a2a-types.ts';

// ---------------------------------------------------------------------------
// In-memory task store
// ---------------------------------------------------------------------------

interface StoredTask {
	id: string;
	contextId?: string;
	state: A2ATaskState;
	agentResponse?: string;
	history: A2AMessage[];
	createdAt: string;
	updatedAt: string;
}

const tasks = new Map<string, StoredTask>();

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface A2AAdapterOptions {
	/** Flue agent module name (matches the filename in src/agents/). */
	agentName: string;
	/** Base URL where the server is accessible (for Agent Card). */
	baseUrl: string;
	/** Port the Flue dev server listens on (default: 1999). */
	fluePort?: number;
	/** Agent card metadata. */
	card: {
		name: string;
		description: string;
		version: string;
		skills: A2AAgentSkill[];
	};
}

// ---------------------------------------------------------------------------
// Adapter factory
// ---------------------------------------------------------------------------

/**
 * Creates a Hono app with A2A protocol routes that bridge to a Flue agent.
 *
 * Routes (per A2A spec, HTTP+JSON binding):
 * - GET  /.well-known/agent-card.json — Agent Card discovery
 * - POST /message:send                — Send a message (blocking)
 * - POST /message:stream              — Returns UnsupportedOperationError
 * - GET  /tasks/:taskId               — Get task status
 * - GET  /tasks                       — Returns UnsupportedOperationError
 * - POST /tasks/:taskIdAction         — Cancel task (stub)
 */
export function createA2AAdapter(options: A2AAdapterOptions): Hono {
	const { agentName, baseUrl, card } = options;
	const fluePort = options.fluePort ?? 1999;
	const flueBaseUrl = `http://localhost:${String(fluePort)}`;

	// Build the Agent Card
	const agentCard: A2AAgentCard = {
		name: card.name,
		description: card.description,
		version: card.version,
		supportedInterfaces: [
			{
				url: baseUrl,
				protocolBinding: 'HTTP+JSON',
				protocolVersion: '1.0',
			},
		],
		capabilities: {
			streaming: false,
			pushNotifications: false,
		},
		defaultInputModes: ['text/plain'],
		defaultOutputModes: ['text/plain'],
		skills: card.skills,
	};

	const cardJson = JSON.stringify(agentCard);
	const app = new Hono();

	// -----------------------------------------------------------------------
	// GET /.well-known/agent-card.json — Agent Card discovery (public)
	// -----------------------------------------------------------------------
	app.get('/.well-known/agent-card.json', (c) => {
		return c.newResponse(cardJson, {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=3600',
			},
		});
	});

	// -----------------------------------------------------------------------
	// POST /message:send — Send a message (blocking)
	// -----------------------------------------------------------------------
	app.post('/message:send', async (c) => {
		// Validate content type
		const contentType = c.req.header('content-type')?.split(';')[0]?.trim().toLowerCase();
		if (contentType !== 'application/json' && contentType !== 'application/a2a+json') {
			return c.newResponse(null, { status: 415 });
		}

		// Parse request body
		let body: A2ASendMessageRequest;
		try {
			body = await c.req.json<A2ASendMessageRequest>();
		} catch {
			return a2aError(c, 400, 'Invalid JSON body.');
		}

		// Validate message structure
		const message = body.message;
		if (!message || typeof message !== 'object') {
			return a2aError(c, 400, 'Missing or invalid "message" field.');
		}
		if (!message.messageId || typeof message.messageId !== 'string') {
			return a2aError(c, 400, 'Missing or invalid "message.messageId".');
		}
		if (!message.role || typeof message.role !== 'string') {
			return a2aError(c, 400, 'Missing or invalid "message.role".');
		}
		if (!Array.isArray(message.parts) || message.parts.length === 0) {
			return a2aError(c, 400, 'Missing or empty "message.parts".');
		}

		// Extract text content from A2A message parts
		const textParts: string[] = [];
		for (const part of message.parts) {
			if ('text' in part && typeof part.text === 'string') {
				textParts.push(part.text);
			}
		}

		const userMessage = textParts.join('\n');
		if (!userMessage) {
			return a2aError(c, 400, 'Message must contain at least one text part.');
		}

		// Use existing task ID or generate a new one
		const taskId = message.taskId ?? crypto.randomUUID();
		const contextId = message.contextId ?? taskId;

		// Create or update the stored task
		const now = new Date().toISOString();
		let stored = tasks.get(taskId);
		if (!stored) {
			stored = {
				id: taskId,
				contextId,
				state: 'TASK_STATE_SUBMITTED',
				history: [],
				createdAt: now,
				updatedAt: now,
			};
			tasks.set(taskId, stored);
		}

		// Record the user message in history
		stored.history.push({
			messageId: message.messageId,
			role: 'ROLE_USER',
			parts: [{ text: userMessage }],
		});
		stored.state = 'TASK_STATE_WORKING';
		stored.updatedAt = now;

		// Bridge to Flue agent via its HTTP API
		// POST /agents/:name/:id?wait=result sends a prompt and waits
		try {
			const flueUrl = `${flueBaseUrl}/agents/${agentName}/${taskId}?wait=result`;
			const flueResponse = await fetch(flueUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message: userMessage }),
			});

			if (!flueResponse.ok) {
				const errorText = await flueResponse.text();
				stored.state = 'TASK_STATE_FAILED';
				stored.updatedAt = new Date().toISOString();
				return a2aError(
					c,
					502,
					`Flue agent returned ${String(flueResponse.status)}: ${errorText}`,
				);
			}

			// Parse the Flue response
			const responseText = await flueResponse.text();
			const agentText = extractAgentText(responseText);

			// Update task state
			const agentMessageId = crypto.randomUUID();
			stored.state = 'TASK_STATE_COMPLETED';
			stored.agentResponse = agentText;
			stored.updatedAt = new Date().toISOString();
			stored.history.push({
				messageId: agentMessageId,
				role: 'ROLE_AGENT',
				parts: [{ text: agentText }],
			});

			// Build A2A response
			const response: A2ASendMessageResponse = {
				task: storedToA2ATask(stored),
			};

			return c.json(response, {
				status: 200,
				headers: { 'Content-Type': 'application/a2a+json' },
			});
		} catch (err) {
			stored.state = 'TASK_STATE_FAILED';
			stored.updatedAt = new Date().toISOString();
			const detail = err instanceof Error ? err.message : 'Unknown error';
			return a2aError(c, 502, `Failed to reach Flue agent: ${detail}`);
		}
	});

	// -----------------------------------------------------------------------
	// POST /message:stream — Streaming (not supported)
	// -----------------------------------------------------------------------
	app.post('/message:stream', (c) => {
		return a2aError(
			c,
			400,
			'SendStreamingMessage is not supported by this agent.',
			'UNSUPPORTED_OPERATION',
		);
	});

	// -----------------------------------------------------------------------
	// GET /tasks/:taskId — Get task status
	// -----------------------------------------------------------------------
	app.get('/tasks/:taskId', (c) => {
		const taskId = c.req.param('taskId');
		const stored = tasks.get(taskId);
		if (!stored) {
			return a2aError(c, 404, `Task ${taskId} not found.`, 'TASK_NOT_FOUND');
		}
		return c.json(storedToA2ATask(stored), {
			status: 200,
			headers: { 'Content-Type': 'application/a2a+json' },
		});
	});

	// -----------------------------------------------------------------------
	// GET /tasks — List tasks (not supported)
	// -----------------------------------------------------------------------
	app.get('/tasks', (c) => {
		return a2aError(
			c,
			400,
			'ListTasks is not supported by this agent.',
			'UNSUPPORTED_OPERATION',
		);
	});

	// -----------------------------------------------------------------------
	// POST /tasks/:taskIdAction — Cancel task (not supported)
	// A2A uses /tasks/{id}:cancel (Google API custom-method convention).
	// Hono captures the full segment as :taskIdAction; we parse the suffix.
	// -----------------------------------------------------------------------
	app.post('/tasks/:taskIdAction', (c) => {
		const raw = c.req.param('taskIdAction');
		if (!raw.endsWith(':cancel')) {
			return a2aError(c, 404, 'Not found.');
		}
		return a2aError(
			c,
			400,
			'CancelTask is not supported by this agent.',
			'UNSUPPORTED_OPERATION',
		);
	});

	return app;
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

/**
 * Build a google.rpc.Status error response per A2A spec Section 11.6.
 */
function a2aError(
	c: { json: (data: unknown, init: { status: number; headers: Record<string, string> }) => Response },
	httpStatus: number,
	message: string,
	reason?: string,
): Response {
	const statusName = httpStatusToCanonical(httpStatus);
	const body: A2ARpcStatus = {
		error: {
			code: httpStatus,
			status: statusName,
			message,
			details: reason
				? [
						{
							'@type': 'type.googleapis.com/google.rpc.ErrorInfo',
							reason,
							domain: 'a2a-protocol.org',
						},
					]
				: [],
		},
	};
	return c.json(body, {
		status: httpStatus,
		headers: { 'Content-Type': 'application/a2a+json' },
	});
}

function httpStatusToCanonical(status: number): string {
	switch (status) {
		case 400: return 'INVALID_ARGUMENT';
		case 401: return 'UNAUTHENTICATED';
		case 403: return 'PERMISSION_DENIED';
		case 404: return 'NOT_FOUND';
		case 415: return 'INVALID_ARGUMENT';
		case 500: return 'INTERNAL';
		case 502: return 'UNAVAILABLE';
		default: return 'UNKNOWN';
	}
}

// ---------------------------------------------------------------------------
// Flue response parsing
// ---------------------------------------------------------------------------

/**
 * Extract the assistant's text from a Flue ?wait=result response.
 *
 * The response format is a Durable Streams event stream (newline-delimited
 * JSON). We look for events containing assistant text content.
 */
function extractAgentText(responseBody: string): string {
	// Try parsing as a simple JSON object first
	try {
		const json = JSON.parse(responseBody) as Record<string, unknown>;
		if (typeof json['text'] === 'string') return json['text'] as string;
		if (typeof json['message'] === 'string') return json['message'] as string;
	} catch {
		// Not simple JSON — parse as event stream
	}

	// Parse newline-delimited JSON events (Durable Streams format)
	const lines = responseBody.split('\n').filter((line) => line.trim().length > 0);
	const textParts: string[] = [];

	for (const line of lines) {
		try {
			const event = JSON.parse(line) as Record<string, unknown>;
			const data = (event['data'] ?? event) as Record<string, unknown>;

			if (typeof data['text'] === 'string') {
				textParts.push(data['text'] as string);
			} else if (data['type'] === 'text' && typeof data['content'] === 'string') {
				textParts.push(data['content'] as string);
			} else if (
				data['type'] === 'assistant' &&
				Array.isArray(data['content'])
			) {
				for (const part of data['content'] as Array<Record<string, unknown>>) {
					if (part['type'] === 'text' && typeof part['text'] === 'string') {
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

// ---------------------------------------------------------------------------
// Task mapping
// ---------------------------------------------------------------------------

function storedToA2ATask(stored: StoredTask): A2ATask {
	const lastAgent = stored.history
		.filter((h) => h.role === 'ROLE_AGENT')
		.at(-1);

	const artifacts: A2AArtifact[] | undefined = stored.agentResponse
		? [
				{
					artifactId: `${stored.id}-artifact`,
					name: 'response',
					parts: [{ text: stored.agentResponse }],
				},
			]
		: undefined;

	return {
		id: stored.id,
		contextId: stored.contextId,
		status: {
			state: stored.state,
			message: lastAgent,
			timestamp: stored.updatedAt,
		},
		artifacts,
		history: stored.history,
	};
}
