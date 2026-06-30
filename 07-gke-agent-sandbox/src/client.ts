#!/usr/bin/env tsx
/**
 * Demo client for GKE Agent Sandbox.
 *
 * Talks to the sandbox server through the sandbox-router.
 * The router uses the X-Sandbox-ID header to route requests to the
 * correct sandbox pod.
 *
 * Usage:
 *   # Port-forward the router first:
 *   kubectl port-forward svc/sandbox-router-svc 8080:8080
 *
 *   # Then run the demo:
 *   pnpm demo
 *
 *   # Or with a custom router URL and sandbox ID:
 *   ROUTER_URL=http://localhost:8080 SANDBOX_ID=flue-agent-claim pnpm demo
 */

// ── Types ────────────────────────────────────────────────────

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

interface SandboxInfo {
	hostname: string;
	sandboxMode: string;
	project: string;
	model: string;
	nodeVersion: string;
	uptime: number;
	executionTimeout: number;
	maxOutputBytes: number;
}

// ── Client ───────────────────────────────────────────────────

class AgentSandboxClient {
	private readonly routerUrl: string;
	private readonly sandboxId: string;

	constructor(opts: { routerUrl: string; sandboxId: string }) {
		this.routerUrl = opts.routerUrl.replace(/\/$/, '');
		this.sandboxId = opts.sandboxId;
	}

	private async request<T>(path: string, method: string, body?: unknown): Promise<T> {
		const url = `${this.routerUrl}${path}`;
		const headers: Record<string, string> = {
			'X-Sandbox-ID': this.sandboxId,
			'Content-Type': 'application/json',
		};

		const res = await fetch(url, {
			method,
			headers,
			body: body ? JSON.stringify(body) : undefined,
		});

		if (!res.ok) {
			const text = await res.text();
			throw new Error(`${method} ${path} failed (${res.status}): ${text}`);
		}

		return res.json() as Promise<T>;
	}

	/** Check sandbox health */
	async health(): Promise<{ status: string }> {
		return this.request('/health', 'GET');
	}

	/** Get sandbox environment info */
	async info(): Promise<SandboxInfo> {
		return this.request('/info', 'GET');
	}

	/** Execute a bash command in the sandbox */
	async exec(command: string, timeout?: number): Promise<ExecResult> {
		return this.request('/exec', 'POST', { command, timeout });
	}

	/** Evaluate JavaScript code in the sandbox */
	async eval(code: string): Promise<EvalResult> {
		return this.request('/eval', 'POST', { code });
	}
}

// ── Demo ─────────────────────────────────────────────────────

function printSection(title: string): void {
	console.log(`\n${'─'.repeat(60)}`);
	console.log(`  ${title}`);
	console.log(`${'─'.repeat(60)}`);
}

async function main(): Promise<void> {
	const routerUrl = process.env['ROUTER_URL'] ?? 'http://localhost:8080';
	const sandboxId = process.env['SANDBOX_ID'] ?? 'flue-agent-claim';

	console.log('='.repeat(60));
	console.log(' GKE Agent Sandbox — Demo Client');
	console.log('='.repeat(60));
	console.log(`Router URL:  ${routerUrl}`);
	console.log(`Sandbox ID:  ${sandboxId}`);
	console.log();
	console.log('NOTE: This demo requires:');
	console.log('  1. A GKE cluster with Agent Sandbox enabled');
	console.log('  2. The sandbox manifests applied (k8s/ directory)');
	console.log('  3. Port-forward: kubectl port-forward svc/sandbox-router-svc 8080:8080');

	const client = new AgentSandboxClient({ routerUrl, sandboxId });

	// ── Step 1: Health check ──────────────────────────────────
	printSection('Step 1: Health Check');
	try {
		const health = await client.health();
		console.log(`Status: ${health.status}`);
	} catch (err) {
		console.error(`Health check failed: ${err instanceof Error ? err.message : err}`);
		console.error('\nMake sure the sandbox is running and port-forward is active.');
		process.exit(1);
	}

	// ── Step 2: Environment info ──────────────────────────────
	printSection('Step 2: Sandbox Environment Info');
	const info = await client.info();
	console.log(`Hostname:     ${info.hostname}`);
	console.log(`Sandbox mode: ${info.sandboxMode}`);
	console.log(`Node.js:      ${info.nodeVersion}`);
	console.log(`Project:      ${info.project}`);
	console.log(`Uptime:       ${info.uptime.toFixed(1)}s`);
	console.log(`Exec timeout: ${info.executionTimeout}ms`);

	// ── Step 3: Execute bash commands ─────────────────────────
	printSection('Step 3: Bash — System Information');
	const sysInfo = await client.exec(
		'echo "Hostname: $(hostname)" && ' +
		'echo "Kernel: $(uname -r)" && ' +
		'echo "User: $(whoami)" && ' +
		'echo "PWD: $(pwd)" && ' +
		'echo "gVisor: $(dmesg 2>/dev/null | head -1 || echo check-runtime)"',
	);
	console.log(sysInfo.stdout);
	console.log(`Exit code: ${sysInfo.exitCode} (${sysInfo.durationMs}ms)`);

	printSection('Step 3b: Bash — List Filesystem');
	const lsResult = await client.exec('ls -la /app && echo "---" && ls -la /tmp');
	console.log(lsResult.stdout);
	if (lsResult.stderr) console.log(`[stderr] ${lsResult.stderr}`);

	printSection('Step 3c: Bash — Available Tools');
	const tools = await client.exec(
		'echo "Node: $(node --version 2>&1)" && ' +
		'echo "npm: $(npm --version 2>&1)" && ' +
		'echo "git: $(git --version 2>&1 || echo not-installed)" && ' +
		'echo "curl: $(curl --version 2>&1 | head -1 || echo not-installed)"',
	);
	console.log(tools.stdout);

	// ── Step 4: Evaluate JavaScript ───────────────────────────
	printSection('Step 4: JavaScript Evaluation');

	const mathResult = await client.eval('return 42 * 17 + Math.PI');
	console.log(`42 * 17 + PI = ${mathResult.result} (${mathResult.durationMs}ms)`);

	const jsonResult = await client.eval(
		'return JSON.stringify({ greeting: "Hello from sandbox!", ' +
		'timestamp: new Date().toISOString(), random: Math.random() }, null, 2)',
	);
	console.log(`JSON output:\n${jsonResult.result}`);

	// ── Step 5: Write and read a file ─────────────────────────
	printSection('Step 5: File Operations in Sandbox');

	const writeResult = await client.exec(
		'echo \'{"agent": "flue", "sandbox": "gke-agent-sandbox"}\' > /tmp/test.json && ' +
		'cat /tmp/test.json',
	);
	console.log(`Written and read: ${writeResult.stdout}`);

	// ── Step 6: Error handling ────────────────────────────────
	printSection('Step 6: Error Handling');

	const failResult = await client.exec('exit 42');
	console.log(`exit 42 → exitCode: ${failResult.exitCode}`);

	const evalError = await client.eval('throw new Error("intentional test error")');
	console.log(`throw Error → error: ${evalError.error}`);

	// ── Done ──────────────────────────────────────────────────
	console.log(`\n${'='.repeat(60)}`);
	console.log(' Demo complete.');
	console.log(`${'='.repeat(60)}`);
}

main().catch((err: unknown) => {
	console.error('Demo failed:', err);
	process.exit(1);
});
