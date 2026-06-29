/**
 * GEAP Managed Agents Sandbox client.
 *
 * Wraps the Gemini Enterprise Agent Platform sandbox REST API for the
 * full-featured "Managed Agents" sandbox — the one with bash shell access,
 * pip/npm install, persistent filesystem, BYOC containers, and snapshots.
 *
 * ## Two sandbox APIs in GEAP
 *
 * GEAP exposes two distinct sandbox surfaces:
 *
 * 1. **Code Execution Sandbox** (exploration 03)
 *    - Endpoint: `POST /v1beta1/{agentEngineName}/sandboxEnvironments`
 *    - Spec: `{ codeExecutionEnvironment: { codeLanguage: "LANGUAGE_PYTHON" } }`
 *    - Capability: Python/JS execution only, no bash, no package install
 *
 * 2. **Managed Agents Sandbox** (this exploration)
 *    - Can be used via the **Interactions API** for agent-driven workloads
 *    - Or via the **Scale Sandbox API** for direct bash/file operations
 *    - Spec supports `managedEnvironment` with optional BYOC container image
 *    - Full bash shell, pip/npm install, file I/O, snapshots
 *    - 7-day TTL, auto-reset on each interaction
 *
 * ## API Endpoints
 *
 * ### Interactions API (agent-driven sandbox)
 * ```
 * POST https://aiplatform.googleapis.com/v1beta1/projects/{project}/locations/global/interactions
 * ```
 * Creates/reuses a remote sandbox environment. The Antigravity harness runs
 * inside the sandbox and can execute bash commands, install packages, etc.
 *
 * ### Scale Sandbox API (direct sandbox control)
 * ```
 * POST   /v1beta1/{agentEngineName}/sandboxEnvironments          — create
 * POST   /v1beta1/{sandboxName}:execute                          — execute
 * GET    /v1beta1/{sandboxName}                                  — get
 * DELETE /v1beta1/{sandboxName}                                  — delete
 * POST   /v1beta1/{sandboxName}:snapshot                         — snapshot
 * POST   /v1beta1/{agentEngineName}/sandboxEnvironments:restore  — restore
 * ```
 *
 * ## BYOC (Bring Your Own Container)
 *
 * Custom container sandboxes (Preview) let you specify a container image
 * from Artifact Registry. The image must be accessible by the Agent Platform
 * Service Agent (`service-{PROJECT_NUMBER}@gcp-sa-aiplatform.iam.gserviceaccount.com`)
 * with `roles/artifactregistry.reader`.
 *
 * The container image is specified in the sandbox spec:
 * ```json
 * {
 *   "spec": {
 *     "managedEnvironment": {
 *       "containerImage": "us-docker.pkg.dev/PROJECT/REPO/IMAGE:TAG",
 *       "networkAccess": { "allowlist": [{ "domain": "*" }] }
 *     }
 *   }
 * }
 * ```
 *
 * ⚠️  NOTE: The exact REST field names for BYOC are derived from the Python
 * SDK patterns and release notes. The BYOC feature is in Preview and the
 * REST schema may differ slightly. See README.md for verification notes.
 */

// ── Types ─────────────────────────────────────────────────────

/** Result from a sandbox command/code execution. */
export interface ExecutionResult {
	exitStatus: number;
	stdout: string;
	stderr: string;
}

/** Network access configuration for the sandbox. */
export interface NetworkConfig {
	/** Domains the sandbox can reach. Use ["*"] for unrestricted. */
	allowlist: string[];
}

/** Configuration for the managed sandbox environment. */
export interface ManagedEnvironmentSpec {
	/**
	 * Artifact Registry container image URI.
	 * Example: us-docker.pkg.dev/my-project/flue/sandbox:latest
	 * If omitted, uses the default GEAP sandbox image.
	 */
	containerImage?: string;
	/** Network access configuration. Disabled by default. */
	networkAccess?: NetworkConfig;
}

/** Options for creating a GeapManagedSandbox. */
export interface GeapManagedSandboxOptions {
	/** GCP project ID. Falls back to GOOGLE_CLOUD_PROJECT env var. */
	project?: string;
	/** GCP region for the Agent Engine. Defaults to us-central1. */
	region?: string;
	/** OAuth2 access token. Falls back to GOOGLE_ACCESS_TOKEN env var. */
	accessToken?: string;
	/** Existing agent engine (reasoning engine) resource name. */
	agentEngineName?: string;
}

/** Snapshot metadata returned after snapshotting a sandbox. */
export interface SnapshotInfo {
	/** Full resource name of the snapshot. */
	name: string;
	/** ISO timestamp of when the snapshot was taken. */
	createTime: string;
}

// ── Client ────────────────────────────────────────────────────

export class GeapManagedSandbox {
	private readonly project: string;
	private readonly region: string;
	private readonly accessToken: string;
	private readonly baseUrl: string;

	/** Full resource name of the agent engine (reasoning engine). */
	private agentEngineName: string | undefined;
	/** Full resource name of the sandbox environment. */
	private sandboxName: string | undefined;
	/** Whether we created the agent engine (and should clean it up). */
	private ownsAgentEngine = false;

	constructor(options: GeapManagedSandboxOptions = {}) {
		this.project = options.project ?? process.env['GOOGLE_CLOUD_PROJECT'] ?? '';
		this.region = options.region ?? 'us-central1';
		this.accessToken = options.accessToken ?? process.env['GOOGLE_ACCESS_TOKEN'] ?? '';
		this.agentEngineName = options.agentEngineName;

		if (!this.project) throw new Error('GCP project required (set GOOGLE_CLOUD_PROJECT or pass project option)');
		if (!this.accessToken) throw new Error('Access token required (set GOOGLE_ACCESS_TOKEN or pass accessToken option)');

		this.baseUrl = `https://${this.region}-aiplatform.googleapis.com/v1beta1`;
	}

	// ── Public API ────────────────────────────────────────────

	/**
	 * Create a managed sandbox environment.
	 *
	 * If no agent engine is provided, one is created automatically.
	 *
	 * @param spec - Optional managed environment spec (container image, network).
	 *               If omitted, uses the default GEAP sandbox (Ubuntu, Python 3.12, Node 22).
	 */
	async createSandbox(spec?: ManagedEnvironmentSpec): Promise<string> {
		if (!this.agentEngineName) {
			this.agentEngineName = await this.createAgentEngine();
			this.ownsAgentEngine = true;
		}

		const url = `${this.baseUrl}/${this.agentEngineName}/sandboxEnvironments`;

		// Build the sandbox spec.
		// For a default managed sandbox: { managedEnvironment: {} }
		// For BYOC: { managedEnvironment: { containerImage: "...", networkAccess: {...} } }
		const managedEnv: Record<string, unknown> = {};

		if (spec?.containerImage) {
			managedEnv['containerImage'] = spec.containerImage;
		}

		if (spec?.networkAccess) {
			managedEnv['networkAccess'] = {
				allowlist: spec.networkAccess.allowlist.map((domain) => ({ domain })),
			};
		}

		const body = {
			spec: {
				managedEnvironment: managedEnv,
			},
		};

		const res = await this.apiFetch(url, { method: 'POST', body });
		const data = (await res.json()) as Record<string, unknown>;

		// The response is a long-running operation — poll until done.
		const sandbox = await this.pollOperation(data);
		this.sandboxName = (sandbox as Record<string, unknown>)['name'] as string;

		if (!this.sandboxName) {
			throw new Error(`Sandbox creation returned unexpected shape: ${JSON.stringify(sandbox)}`);
		}

		return this.sandboxName;
	}

	/**
	 * Execute a bash command in the sandbox.
	 *
	 * The managed sandbox provides a full bash terminal. Commands run as
	 * the sandbox user and have access to the persistent filesystem.
	 *
	 * Under the hood this sends a JSON-encoded payload to the :execute
	 * endpoint. The managed sandbox interprets `{ command: "..." }` as
	 * a bash command (vs `{ code: "..." }` for Python execution in the
	 * code execution sandbox).
	 *
	 * ⚠️  NOTE: The exact input format for bash commands may differ from
	 * the code execution sandbox. The code execution sandbox uses
	 * `{ code: "..." }` — the managed sandbox likely uses `{ command: "..." }`
	 * or wraps bash in a different execution type. This needs E2E verification.
	 */
	async executeBash(command: string): Promise<ExecutionResult> {
		if (!this.sandboxName) throw new Error('Sandbox not created — call createSandbox() first');

		const url = `${this.baseUrl}/${this.sandboxName}:execute`;

		// For managed sandbox bash execution, the input payload specifies
		// a bash command rather than Python code.
		const inputPayload = JSON.stringify({ command });
		const body = {
			inputs: [
				{
					data: Buffer.from(inputPayload).toString('base64'),
					mimeType: 'application/json',
				},
			],
		};

		const res = await this.apiFetch(url, { method: 'POST', body });
		return this.parseExecutionResponse(res);
	}

	/**
	 * Execute Python code in the sandbox.
	 *
	 * The managed sandbox can also run Python scripts directly, just like
	 * the code execution sandbox — but with the added benefit of being
	 * able to pip-install packages first.
	 */
	async executePython(code: string): Promise<ExecutionResult> {
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

		const res = await this.apiFetch(url, { method: 'POST', body });
		return this.parseExecutionResponse(res);
	}

	/**
	 * Write a file to the sandbox filesystem.
	 *
	 * Uses bash `cat` with a heredoc to write arbitrary content to a path.
	 * For binary files, consider base64-encoding the content and decoding
	 * in the sandbox.
	 */
	async writeFile(path: string, content: string): Promise<ExecutionResult> {
		// Escape the heredoc delimiter to avoid content collisions.
		const delimiter = 'FLUE_EOF_' + Math.random().toString(36).slice(2, 8).toUpperCase();
		const command = `cat > ${shellEscape(path)} <<'${delimiter}'\n${content}\n${delimiter}`;
		return this.executeBash(command);
	}

	/**
	 * Read a file from the sandbox filesystem.
	 *
	 * Returns the file content in stdout.
	 */
	async readFile(path: string): Promise<string> {
		const result = await this.executeBash(`cat ${shellEscape(path)}`);
		if (result.exitStatus !== 0) {
			throw new Error(`Failed to read ${path}: ${result.stderr}`);
		}
		return result.stdout;
	}

	/**
	 * Snapshot the current sandbox state.
	 *
	 * Snapshots capture the full filesystem, installed packages, and
	 * environment state. They can be restored to a new sandbox later.
	 *
	 * ⚠️  Snapshot support is in Preview. The REST endpoint and response
	 * format need E2E verification.
	 */
	async snapshot(): Promise<SnapshotInfo> {
		if (!this.sandboxName) throw new Error('Sandbox not created — call createSandbox() first');

		const url = `${this.baseUrl}/${this.sandboxName}:snapshot`;
		const res = await this.apiFetch(url, { method: 'POST', body: {} });
		const data = (await res.json()) as Record<string, unknown>;

		// Snapshot creation is likely an LRO.
		const result = await this.pollOperation(data);
		const resultObj = result as Record<string, unknown>;

		return {
			name: (resultObj['name'] as string) ?? '',
			createTime: (resultObj['createTime'] as string) ?? new Date().toISOString(),
		};
	}

	/**
	 * Restore a sandbox from a snapshot.
	 *
	 * Creates a new sandbox environment initialized from the snapshot state.
	 *
	 * ⚠️  Snapshot restore is in Preview. The REST endpoint and response
	 * format need E2E verification.
	 */
	async restoreFromSnapshot(snapshotName: string): Promise<string> {
		if (!this.agentEngineName) {
			throw new Error('Agent engine required — call createSandbox() first or provide agentEngineName');
		}

		const url = `${this.baseUrl}/${this.agentEngineName}/sandboxEnvironments:restore`;
		const body = { snapshotName };

		const res = await this.apiFetch(url, { method: 'POST', body });
		const data = (await res.json()) as Record<string, unknown>;

		const sandbox = await this.pollOperation(data);
		this.sandboxName = (sandbox as Record<string, unknown>)['name'] as string;

		if (!this.sandboxName) {
			throw new Error(`Snapshot restore returned unexpected shape: ${JSON.stringify(sandbox)}`);
		}

		return this.sandboxName;
	}

	/**
	 * Destroy the sandbox (and agent engine if we created it).
	 */
	async destroy(): Promise<void> {
		if (this.sandboxName) {
			const url = `${this.baseUrl}/${this.sandboxName}`;
			await this.apiFetch(url, { method: 'DELETE' });
			this.sandboxName = undefined;
		}

		if (this.ownsAgentEngine && this.agentEngineName) {
			const url = `${this.baseUrl}/${this.agentEngineName}`;
			const res = await this.apiFetch(url, { method: 'DELETE' });
			const data = (await res.json()) as Record<string, unknown>;
			if (data['name'] && typeof data['done'] !== 'undefined') {
				await this.pollOperation(data);
			}
			this.agentEngineName = undefined;
			this.ownsAgentEngine = false;
		}
	}

	/** The sandbox resource name, if created. */
	get name(): string | undefined {
		return this.sandboxName;
	}

	/** The agent engine resource name. */
	get engineName(): string | undefined {
		return this.agentEngineName;
	}

	// ── Internals ─────────────────────────────────────────────

	/** Create a minimal agent engine (reasoning engine) to host sandbox environments. */
	private async createAgentEngine(): Promise<string> {
		const parent = `projects/${this.project}/locations/${this.region}`;
		const url = `${this.baseUrl}/${parent}/reasoningEngines`;
		const body = {
			displayName: `flue-managed-sandbox-${Date.now()}`,
		};

		const res = await this.apiFetch(url, { method: 'POST', body });
		const data = (await res.json()) as Record<string, unknown>;

		const engine = await this.pollOperation(data);
		const name = (engine as Record<string, unknown>)['name'] as string | undefined;
		if (!name) {
			throw new Error(`Agent engine creation returned unexpected shape: ${JSON.stringify(engine)}`);
		}
		return name;
	}

	/** Parse the base64-encoded execution response. */
	private async parseExecutionResponse(res: Response): Promise<ExecutionResult> {
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

	/** Poll a long-running operation until done. */
	private async pollOperation(operation: Record<string, unknown>): Promise<unknown> {
		if (operation['done']) {
			return this.unwrapOperation(operation);
		}

		const opName = operation['name'] as string | undefined;
		if (!opName) {
			return operation;
		}

		const pollUrl = `${this.baseUrl}/${opName}`;
		const startMs = Date.now();
		const timeoutMs = 5 * 60 * 1000;

		while (Date.now() - startMs < timeoutMs) {
			await sleep(3000);

			const res = await this.apiFetch(pollUrl, { method: 'GET' });
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
	private async apiFetch(url: string, options: { method: string; body?: unknown }): Promise<Response> {
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

// ── Interactions API Client ───────────────────────────────────

/**
 * Options for the Interactions API client.
 *
 * The Interactions API is a higher-level API that manages the full
 * agent lifecycle. It creates sandboxes on-demand and drives the
 * Antigravity agent harness inside them.
 */
export interface InteractionsClientOptions {
	/** GCP project ID. Falls back to GOOGLE_CLOUD_PROJECT env var. */
	project?: string;
	/** OAuth2 access token. Falls back to GOOGLE_ACCESS_TOKEN env var. */
	accessToken?: string;
	/** Agent ID to use. Defaults to "antigravity-preview-05-2026". */
	agent?: string;
}

/** A source to mount into the sandbox environment. */
export interface EnvironmentSource {
	type: 'inline' | 'gcs';
	/** Target path inside the sandbox. */
	target: string;
	/** For inline: the file content. For gcs: the GCS URI. */
	content?: string;
	source?: string;
}

/** Environment configuration for an interaction. */
export interface InteractionEnvironment {
	type: 'remote';
	/** Sources to mount into the sandbox. */
	sources?: EnvironmentSource[];
	/** Network configuration. */
	network?: { allowlist: Array<{ domain: string }> };
}

/** An interaction step (tool call, code execution, etc.). */
export interface InteractionStep {
	type: string;
	content: string;
}

/** Result of an interaction. */
export interface InteractionResult {
	/** Interaction ID for multi-turn continuations. */
	interactionId: string;
	/** Environment ID for sandbox reuse. */
	environmentId: string;
	/** The agent's final text response. */
	outputText: string;
	/** Individual steps the agent took. */
	steps: InteractionStep[];
}

/**
 * Client for the GEAP Interactions API.
 *
 * This is the higher-level API that drives the Antigravity agent
 * inside a managed sandbox. The agent can execute bash commands,
 * install packages, read/write files, and browse the web.
 *
 * ```
 * POST https://aiplatform.googleapis.com/v1beta1/projects/{project}/locations/global/interactions
 *
 * Body:
 * {
 *   "agent": "antigravity-preview-05-2026",
 *   "input": "List all Python files in the workspace",
 *   "environment": "remote"                         // new sandbox
 *   // OR
 *   "environment": "env-abc123"                     // reuse existing
 * }
 *
 * Response:
 * {
 *   "interaction": {
 *     "id": "interaction-xyz",
 *     "environmentId": "env-abc123",
 *     "outputText": "Found 3 Python files: ...",
 *     "steps": [
 *       { "type": "bash", "content": "find /workspace -name '*.py'" },
 *       { "type": "text", "content": "Found 3 Python files..." }
 *     ]
 *   }
 * }
 * ```
 */
export class GeapInteractionsClient {
	private readonly project: string;
	private readonly accessToken: string;
	private readonly agent: string;
	private readonly baseUrl: string;

	/** Environment ID from the most recent interaction. */
	private environmentId: string | undefined;
	/** Interaction ID from the most recent interaction. */
	private lastInteractionId: string | undefined;

	constructor(options: InteractionsClientOptions = {}) {
		this.project = options.project ?? process.env['GOOGLE_CLOUD_PROJECT'] ?? '';
		this.accessToken = options.accessToken ?? process.env['GOOGLE_ACCESS_TOKEN'] ?? '';
		this.agent = options.agent ?? 'antigravity-preview-05-2026';

		if (!this.project) throw new Error('GCP project required');
		if (!this.accessToken) throw new Error('Access token required');

		// Interactions API only supports global location.
		this.baseUrl = `https://aiplatform.googleapis.com/v1beta1/projects/${this.project}/locations/global`;
	}

	/**
	 * Send an interaction to the agent.
	 *
	 * First call creates a new sandbox. Subsequent calls reuse the same
	 * sandbox via the environment ID.
	 *
	 * @param input - Natural-language instruction for the agent.
	 * @param environment - Optional environment override. Pass a full
	 *   InteractionEnvironment object for the first call to configure
	 *   sources and network access. Subsequent calls can pass just the
	 *   environment ID string.
	 */
	async interact(
		input: string,
		environment?: string | InteractionEnvironment,
	): Promise<InteractionResult> {
		const url = `${this.baseUrl}/interactions`;

		const body: Record<string, unknown> = {
			agent: this.agent,
			input,
		};

		// Determine environment parameter.
		if (environment) {
			body['environment'] = environment;
		} else if (this.environmentId) {
			// Reuse existing sandbox.
			body['environment'] = this.environmentId;
			body['previous_interaction_id'] = this.lastInteractionId;
		} else {
			// First call — create a new remote sandbox.
			body['environment'] = 'remote';
		}

		const res = await this.apiFetch(url, { method: 'POST', body });
		const data = (await res.json()) as {
			interaction?: {
				id?: string;
				environmentId?: string;
				outputText?: string;
				steps?: Array<{ type?: string; content?: string }>;
			};
		};

		const interaction = data.interaction;
		if (!interaction) {
			throw new Error(`Interaction returned unexpected shape: ${JSON.stringify(data)}`);
		}

		this.environmentId = interaction.environmentId;
		this.lastInteractionId = interaction.id;

		return {
			interactionId: interaction.id ?? '',
			environmentId: interaction.environmentId ?? '',
			outputText: interaction.outputText ?? '',
			steps: (interaction.steps ?? []).map((s) => ({
				type: s.type ?? 'unknown',
				content: s.content ?? '',
			})),
		};
	}

	/** Get the current environment ID (for external reuse). */
	get envId(): string | undefined {
		return this.environmentId;
	}

	/** Fetch wrapper with auth headers. */
	private async apiFetch(url: string, options: { method: string; body?: unknown }): Promise<Response> {
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
			throw new Error(`GEAP Interactions API ${options.method} ${url} returned ${res.status}: ${text}`);
		}

		return res;
	}
}

// ── Utilities ─────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Minimal shell escaping for file paths. */
function shellEscape(s: string): string {
	return `'${s.replace(/'/g, "'\\''")}'`;
}
