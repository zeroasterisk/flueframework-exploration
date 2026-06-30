/**
 * Sandbox Execution Server for GKE Agent Sandbox.
 *
 * Runs inside the sandbox pod (gVisor-isolated). Provides an HTTP API
 * for executing code and shell commands. The sandbox-router proxies
 * requests here using the X-Sandbox-ID header.
 *
 * Endpoints:
 *   GET  /health  — liveness probe
 *   GET  /ready   — readiness probe
 *   POST /exec    — execute a bash command
 *   POST /eval    — evaluate JavaScript code
 *   GET  /info    — sandbox environment info
 *
 * Unlike GEAP's managed sandbox API (which you call via Google's REST API),
 * this server IS the sandbox. It runs your code directly inside the
 * gVisor-isolated container, and the sandbox-router handles routing.
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { execSync } from 'node:child_process';
import { hostname } from 'node:os';

const PORT = parseInt(process.env['PORT'] ?? '8080', 10);
const EXECUTION_TIMEOUT_MS = parseInt(process.env['EXECUTION_TIMEOUT_MS'] ?? '30000', 10);
const MAX_OUTPUT_BYTES = parseInt(process.env['MAX_OUTPUT_BYTES'] ?? '1048576', 10);

// ── Types ────────────────────────────────────────────────────

interface ExecRequest {
	command: string;
	timeout?: number;  // ms, defaults to EXECUTION_TIMEOUT_MS
}

interface EvalRequest {
	code: string;
	timeout?: number;
}

interface ExecResult {
	stdout: string;
	stderr: string;
	exitCode: number;
	durationMs: number;
}

interface EvalResult {
	result: string;
	durationMs: number;
	error?: string;
}

// ── Execution helpers ────────────────────────────────────────

function executeBash(req: ExecRequest): ExecResult {
	const timeout = req.timeout ?? EXECUTION_TIMEOUT_MS;
	const start = Date.now();

	try {
		const stdout = execSync(req.command, {
			timeout,
			maxBuffer: MAX_OUTPUT_BYTES,
			encoding: 'utf-8',
			stdio: ['pipe', 'pipe', 'pipe'],
		});

		return {
			stdout: stdout ?? '',
			stderr: '',
			exitCode: 0,
			durationMs: Date.now() - start,
		};
	} catch (err: unknown) {
		const e = err as { stdout?: string; stderr?: string; status?: number };
		return {
			stdout: e.stdout ?? '',
			stderr: e.stderr ?? String(err),
			exitCode: e.status ?? 1,
			durationMs: Date.now() - start,
		};
	}
}

function evaluateJs(req: EvalRequest): EvalResult {
	const start = Date.now();

	try {
		// Use Function constructor for isolation from server scope.
		// This is intentionally eval-like — the sandbox IS the isolation layer.
		const fn = new Function(req.code);
		const result = fn();

		return {
			result: result !== undefined ? String(result) : 'undefined',
			durationMs: Date.now() - start,
		};
	} catch (err: unknown) {
		return {
			result: '',
			error: err instanceof Error ? err.message : String(err),
			durationMs: Date.now() - start,
		};
	}
}

// ── HTTP helpers ─────────────────────────────────────────────

function readBody(req: IncomingMessage): Promise<string> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		let size = 0;

		req.on('data', (chunk: Buffer) => {
			size += chunk.length;
			if (size > MAX_OUTPUT_BYTES) {
				req.destroy();
				reject(new Error('Request body too large'));
				return;
			}
			chunks.push(chunk);
		});

		req.on('end', () => resolve(Buffer.concat(chunks).toString()));
		req.on('error', reject);
	});
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
	const json = JSON.stringify(body);
	res.writeHead(status, {
		'Content-Type': 'application/json',
		'Content-Length': Buffer.byteLength(json),
	});
	res.end(json);
}

// ── Request handler ──────────────────────────────────────────

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
	const url = req.url ?? '/';
	const method = req.method ?? 'GET';

	// Health / liveness
	if (method === 'GET' && (url === '/health' || url === '/')) {
		sendJson(res, 200, { status: 'ok', sandbox: 'gke-agent-sandbox' });
		return;
	}

	// Readiness
	if (method === 'GET' && url === '/ready') {
		sendJson(res, 200, { status: 'ready' });
		return;
	}

	// Environment info
	if (method === 'GET' && url === '/info') {
		sendJson(res, 200, {
			hostname: hostname(),
			sandboxMode: process.env['SANDBOX_MODE'] ?? 'unknown',
			project: process.env['GOOGLE_CLOUD_PROJECT'] ?? 'unknown',
			model: process.env['FLUE_MODEL'] ?? 'not-set',
			nodeVersion: process.version,
			uptime: process.uptime(),
			executionTimeout: EXECUTION_TIMEOUT_MS,
			maxOutputBytes: MAX_OUTPUT_BYTES,
		});
		return;
	}

	// Execute bash command
	if (method === 'POST' && url === '/exec') {
		try {
			const body = await readBody(req);
			const parsed: ExecRequest = JSON.parse(body);

			if (!parsed.command || typeof parsed.command !== 'string') {
				sendJson(res, 400, { error: 'Missing required field: command' });
				return;
			}

			const result = executeBash(parsed);
			sendJson(res, 200, result);
		} catch (err: unknown) {
			sendJson(res, 400, {
				error: err instanceof Error ? err.message : 'Invalid request',
			});
		}
		return;
	}

	// Evaluate JavaScript
	if (method === 'POST' && url === '/eval') {
		try {
			const body = await readBody(req);
			const parsed: EvalRequest = JSON.parse(body);

			if (!parsed.code || typeof parsed.code !== 'string') {
				sendJson(res, 400, { error: 'Missing required field: code' });
				return;
			}

			const result = evaluateJs(parsed);
			sendJson(res, 200, result);
		} catch (err: unknown) {
			sendJson(res, 400, {
				error: err instanceof Error ? err.message : 'Invalid request',
			});
		}
		return;
	}

	// Agent query (compatibility with exploration 06 pattern)
	if (method === 'POST' && url === '/query') {
		try {
			const body = await readBody(req);
			const parsed = JSON.parse(body);
			const message = parsed.message ?? parsed.prompt ?? '';

			// Route calculator-like queries to eval
			if (/calc|math|compute|\d+\s*[+\-*/]/i.test(message)) {
				const match = message.match(/[\d.\s+\-*/()%^]+/);
				if (match) {
					const result = evaluateJs({ code: `return (${match[0].trim()})` });
					sendJson(res, 200, {
						output: `Calculator result: ${result.result ?? result.error}`,
					});
					return;
				}
			}

			sendJson(res, 200, {
				output: `Hello from GKE Agent Sandbox! ` +
					`I'm running in a gVisor-isolated container. ` +
					`Use POST /exec for bash commands or POST /eval for JavaScript. ` +
					`(Pod: ${hostname()}, Project: ${process.env['GOOGLE_CLOUD_PROJECT'] ?? 'unknown'})`,
			});
		} catch (err: unknown) {
			sendJson(res, 400, {
				error: err instanceof Error ? err.message : 'Invalid request',
			});
		}
		return;
	}

	sendJson(res, 404, { error: 'Not found' });
}

// ── Start server ─────────────────────────────────────────────

const server = createServer((req, res) => {
	handleRequest(req, res).catch((err: unknown) => {
		console.error('Unhandled error:', err);
		if (!res.headersSent) {
			sendJson(res, 500, { error: 'Internal server error' });
		}
	});
});

server.listen(PORT, '0.0.0.0', () => {
	console.log(`Flue Agent Sandbox server listening on 0.0.0.0:${PORT}`);
	console.log(`  Sandbox mode: ${process.env['SANDBOX_MODE'] ?? 'gke-agent-sandbox'}`);
	console.log(`  Execution timeout: ${EXECUTION_TIMEOUT_MS}ms`);
	console.log(`  Max output: ${MAX_OUTPUT_BYTES} bytes`);
});
