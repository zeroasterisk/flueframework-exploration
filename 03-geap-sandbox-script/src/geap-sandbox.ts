/**
 * GEAP Code Execution Sandbox client.
 *
 * Wraps the Gemini Enterprise Agent Platform sandbox REST API.
 * Uses the "Code Execution Environment" sandbox type which supports
 * Python and JavaScript execution — no shell access.
 */

/** Decoded result from a sandbox code execution. */
export interface ExecutionResult {
	exitStatus: number;
	stdout: string;
	stderr: string;
}

export interface GeapSandboxOptions {
	/** GCP project ID. Falls back to GOOGLE_CLOUD_PROJECT env var. */
	project?: string;
	/** GCP region. Defaults to us-central1. */
	region?: string;
	/** OAuth2 access token. Falls back to GOOGLE_ACCESS_TOKEN env var. */
	accessToken?: string;
	/** Reasoning engine resource name to attach sandboxes to. If omitted, one is created. */
	reasoningEngineName?: string;
}

export class GeapSandbox {
	private readonly project: string;
	private readonly region: string;
	private readonly accessToken: string;
	private readonly baseUrl: string;

	/** Full resource name of the reasoning engine, e.g. projects/.../reasoningEngines/123 */
	private reasoningEngineName: string | undefined;
	/** Full resource name of the sandbox environment */
	private sandboxName: string | undefined;
	/** Whether we created the reasoning engine (and should clean it up) */
	private ownsReasoningEngine = false;

	constructor(options: GeapSandboxOptions = {}) {
		this.project = options.project ?? process.env['GOOGLE_CLOUD_PROJECT'] ?? '';
		this.region = options.region ?? 'us-central1';
		this.accessToken = options.accessToken ?? process.env['GOOGLE_ACCESS_TOKEN'] ?? '';
		this.reasoningEngineName = options.reasoningEngineName;

		if (!this.project) throw new Error('GCP project required (set GOOGLE_CLOUD_PROJECT or pass project option)');
		if (!this.accessToken) throw new Error('Access token required (set GOOGLE_ACCESS_TOKEN or pass accessToken option)');

		this.baseUrl = `https://${this.region}-aiplatform.googleapis.com/v1beta1`;
	}

	// ── Public API ────────────────────────────────────────────────

	/** Create a reasoning engine (if needed) and a sandbox environment. */
	async createSandbox(): Promise<string> {
		if (!this.reasoningEngineName) {
			this.reasoningEngineName = await this.createReasoningEngine();
			this.ownsReasoningEngine = true;
		}

		const url = `${this.baseUrl}/${this.reasoningEngineName}/sandboxEnvironments`;
		const body = {
			spec: {
				codeExecutionEnvironment: {
					codeLanguage: 'LANGUAGE_PYTHON',
				},
			},
		};

		const res = await this.fetch(url, { method: 'POST', body });
		const data = (await res.json()) as Record<string, unknown>;

		// The response is a long-running operation — poll until done.
		const sandbox = await this.pollOperation(data);
		this.sandboxName = (sandbox as Record<string, unknown>)['name'] as string;

		if (!this.sandboxName) {
			throw new Error(`Sandbox creation returned unexpected shape: ${JSON.stringify(sandbox)}`);
		}

		return this.sandboxName;
	}

	/** Execute Python code in the sandbox and return decoded output. */
	async executeCode(code: string): Promise<ExecutionResult> {
		if (!this.sandboxName) throw new Error('Sandbox not created — call createSandbox() first');

		const url = `${this.baseUrl}/${this.sandboxName}:execute`;
		const inputPayload = JSON.stringify({ code });
		const body = {
			inputs: [
				{
					data: Buffer.from(inputPayload).toString('base64'),
					mimeType: 'application/json',
				},
			],
		};

		const res = await this.fetch(url, { method: 'POST', body });
		const data = (await res.json()) as { outputs?: Array<{ data: string; mimeType: string }> };

		const outputB64 = data.outputs?.[0]?.data;
		if (!outputB64) {
			throw new Error(`Execution returned no outputs: ${JSON.stringify(data)}`);
		}

		const decoded = JSON.parse(Buffer.from(outputB64, 'base64').toString('utf-8')) as {
			exit_status_int?: number;
			msg_out?: string;
			msg_err?: string;
		};

		return {
			exitStatus: decoded.exit_status_int ?? -1,
			stdout: decoded.msg_out ?? '',
			stderr: decoded.msg_err ?? '',
		};
	}

	/** Destroy the sandbox (and reasoning engine if we created it). */
	async destroy(): Promise<void> {
		if (this.sandboxName) {
			const url = `${this.baseUrl}/${this.sandboxName}`;
			await this.fetch(url, { method: 'DELETE' });
			this.sandboxName = undefined;
		}

		if (this.ownsReasoningEngine && this.reasoningEngineName) {
			const url = `${this.baseUrl}/${this.reasoningEngineName}`;
			const res = await this.fetch(url, { method: 'DELETE' });
			// Deletion is an LRO — wait for it to complete.
			const data = (await res.json()) as Record<string, unknown>;
			if (data['name'] && typeof data['done'] !== 'undefined') {
				await this.pollOperation(data);
			}
			this.reasoningEngineName = undefined;
			this.ownsReasoningEngine = false;
		}
	}

	/** The sandbox resource name, if created. */
	get name(): string | undefined {
		return this.sandboxName;
	}

	// ── Internals ─────────────────────────────────────────────────

	/** Create a minimal reasoning engine to host sandbox environments. */
	private async createReasoningEngine(): Promise<string> {
		const parent = `projects/${this.project}/locations/${this.region}`;
		const url = `${this.baseUrl}/${parent}/reasoningEngines`;
		const body = {
			displayName: `flue-sandbox-${Date.now()}`,
		};

		const res = await this.fetch(url, { method: 'POST', body });
		const data = (await res.json()) as Record<string, unknown>;

		// This is an LRO — poll until we get the reasoning engine name.
		const engine = await this.pollOperation(data);
		const name = (engine as Record<string, unknown>)['name'] as string | undefined;
		if (!name) {
			throw new Error(`Reasoning engine creation returned unexpected shape: ${JSON.stringify(engine)}`);
		}
		return name;
	}

	/** Poll a long-running operation until done. */
	private async pollOperation(operation: Record<string, unknown>): Promise<unknown> {
		// If it's already done, return immediately.
		if (operation['done']) {
			return this.unwrapOperation(operation);
		}

		const opName = operation['name'] as string | undefined;
		if (!opName) {
			// Not an LRO — return the response as-is.
			return operation;
		}

		const pollUrl = `${this.baseUrl}/${opName}`;
		const startMs = Date.now();
		const timeoutMs = 5 * 60 * 1000; // 5 minute timeout

		while (Date.now() - startMs < timeoutMs) {
			await sleep(3000);

			const res = await this.fetch(pollUrl, { method: 'GET' });
			const data = (await res.json()) as Record<string, unknown>;

			if (data['done']) {
				return this.unwrapOperation(data);
			}
		}

		throw new Error(`Operation ${opName} timed out after 5 minutes`);
	}

	/** Extract the result or throw the error from a completed LRO. */
	private unwrapOperation(operation: Record<string, unknown>): unknown {
		if (operation['error']) {
			const err = operation['error'] as Record<string, unknown>;
			throw new Error(`Operation failed: ${JSON.stringify(err)}`);
		}
		return operation['response'] ?? operation;
	}

	/** Fetch wrapper that injects auth and content-type headers. */
	private async fetch(url: string, options: { method: string; body?: unknown }): Promise<Response> {
		const headers: Record<string, string> = {
			Authorization: `Bearer ${this.accessToken}`,
		};

		let bodyStr: string | undefined;
		if (options.body !== undefined) {
			headers['Content-Type'] = 'application/json';
			bodyStr = JSON.stringify(options.body);
		}

		const res = await fetch(url, {
			method: options.method,
			headers,
			body: bodyStr,
		});

		if (!res.ok) {
			const text = await res.text();
			throw new Error(`GEAP API ${options.method} ${url} returned ${res.status}: ${text}`);
		}

		return res;
	}
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
