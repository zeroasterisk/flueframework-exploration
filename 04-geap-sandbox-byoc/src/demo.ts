#!/usr/bin/env tsx
/**
 * Demo: GEAP Managed Agents Sandbox with BYOC Container
 *
 * Shows the full capabilities of the managed sandbox:
 *   1. Create a BYOC sandbox with a custom container image
 *   2. Run bash commands (ls, cat, curl)
 *   3. Install a Python package with pip
 *   4. Run a Python script using the installed package
 *   5. Read and write files in the sandbox
 *   6. Snapshot the sandbox state
 *
 * This demo uses the Scale Sandbox API (direct sandbox control).
 * For the Interactions API (agent-driven), see the InteractionsClient
 * class and the interactionsDemo() at the bottom.
 *
 * Usage:
 *   export GOOGLE_CLOUD_PROJECT=your-project-id
 *   export GOOGLE_ACCESS_TOKEN=$(gcloud auth print-access-token)
 *   pnpm demo
 */

import { GeapManagedSandbox, GeapInteractionsClient } from './geap-managed-sandbox.ts';
import type { ExecutionResult, InteractionResult } from './geap-managed-sandbox.ts';

// ── Helpers ───────────────────────────────────────────────────

function printResult(label: string, result: ExecutionResult): void {
	console.log(`\n${'─'.repeat(60)}`);
	console.log(`  ${label}`);
	console.log(`${'─'.repeat(60)}`);

	if (result.stdout) {
		console.log(result.stdout.trimEnd());
	}
	if (result.stderr) {
		console.log(`[stderr] ${result.stderr.trimEnd()}`);
	}
	console.log(`Exit status: ${result.exitStatus}`);
}

function printInteraction(label: string, result: InteractionResult): void {
	console.log(`\n${'─'.repeat(60)}`);
	console.log(`  ${label}`);
	console.log(`${'─'.repeat(60)}`);
	console.log(`Agent response:\n${result.outputText.trimEnd()}`);
	if (result.steps.length > 0) {
		console.log(`\nSteps taken: ${result.steps.length}`);
		for (const step of result.steps) {
			console.log(`  [${step.type}] ${step.content.slice(0, 100)}${step.content.length > 100 ? '...' : ''}`);
		}
	}
	console.log(`Environment: ${result.environmentId}`);
}

// ── Demo: Scale Sandbox API (direct control) ─────────────────

async function scaleSandboxDemo(): Promise<void> {
	console.log('='.repeat(60));
	console.log(' GEAP Managed Agents Sandbox — Scale Sandbox API Demo');
	console.log('='.repeat(60));

	const project = process.env['GOOGLE_CLOUD_PROJECT'] ?? 'your-project-id';
	const containerImage = process.env['BYOC_IMAGE'];

	const sandbox = new GeapManagedSandbox({
		project,
		region: 'us-central1',
	});

	try {
		// ── Step 1: Create sandbox ────────────────────────────────
		console.log('\n[1/6] Creating managed sandbox...');

		if (containerImage) {
			console.log(`      Using BYOC image: ${containerImage}`);
		} else {
			console.log('      Using default GEAP image (set BYOC_IMAGE to use a custom container)');
		}

		const name = await sandbox.createSandbox(
			containerImage
				? {
						containerImage,
						networkAccess: { allowlist: ['*'] },
					}
				: {
						networkAccess: { allowlist: ['*'] },
					},
		);
		console.log(`      Sandbox created: ${name}`);

		// ── Step 2: Run bash commands ─────────────────────────────
		console.log('\n[2/6] Running bash commands...');

		// 2a. List the root filesystem
		printResult(
			'ls -la / (root filesystem)',
			await sandbox.executeBash('ls -la /'),
		);

		// 2b. System info
		printResult(
			'System information',
			await sandbox.executeBash(
				'echo "Hostname: $(hostname)" && echo "Kernel: $(uname -r)" && echo "User: $(whoami)" && echo "PWD: $(pwd)"',
			),
		);

		// 2c. Check available tools
		printResult(
			'Available tools',
			await sandbox.executeBash(
				'echo "Python: $(python3 --version 2>&1)" && echo "Node: $(node --version 2>&1)" && echo "Git: $(git --version 2>&1)" && echo "curl: $(curl --version 2>&1 | head -1)" && echo "jq: $(jq --version 2>&1)"',
			),
		);

		// 2d. curl an external URL (requires network access)
		printResult(
			'curl https://httpbin.org/get (network access test)',
			await sandbox.executeBash(
				'curl -s https://httpbin.org/get | jq .headers',
			),
		);

		// ── Step 3: pip install a package ─────────────────────────
		console.log('\n[3/6] Installing Python package (requests)...');

		printResult(
			'pip install requests',
			await sandbox.executeBash('pip install --quiet requests'),
		);

		// ── Step 4: Run Python using the installed package ────────
		console.log('\n[4/6] Running Python script with installed package...');

		// Write a Python script to the sandbox
		await sandbox.writeFile(
			'/workspace/fetch_demo.py',
			[
				'"""Demo: fetch data using the requests package installed via pip."""',
				'import requests',
				'import json',
				'',
				'resp = requests.get("https://httpbin.org/json")',
				'data = resp.json()',
				'',
				'print(f"Status: {resp.status_code}")',
				'print(f"Content-Type: {resp.headers.get(\'content-type\')}")',
				'print(f"Data keys: {list(data.keys())}")',
				'print(json.dumps(data, indent=2))',
			].join('\n'),
		);

		printResult(
			'python3 /workspace/fetch_demo.py',
			await sandbox.executeBash('python3 /workspace/fetch_demo.py'),
		);

		// ── Step 5: File read/write ───────────────────────────────
		console.log('\n[5/6] File read/write operations...');

		// Write a file
		await sandbox.writeFile(
			'/workspace/config.json',
			JSON.stringify(
				{
					name: 'flue-agent',
					version: '1.0.0',
					capabilities: ['bash', 'python', 'file-io', 'network'],
					sandbox: { type: 'managed', byoc: !!containerImage },
				},
				null,
				2,
			),
		);

		// Read it back
		const configContent = await sandbox.readFile('/workspace/config.json');
		console.log(`\nWrote and read back /workspace/config.json:`);
		console.log(configContent);

		// List workspace files
		printResult(
			'ls -la /workspace/',
			await sandbox.executeBash('ls -la /workspace/'),
		);

		// ── Step 6: Snapshot ──────────────────────────────────────
		console.log('\n[6/6] Snapshotting sandbox state...');

		try {
			const snapshot = await sandbox.snapshot();
			console.log(`      Snapshot created: ${snapshot.name}`);
			console.log(`      Timestamp: ${snapshot.createTime}`);
			console.log('      This snapshot captures all installed packages, files, and state.');
			console.log('      It can be restored to a new sandbox later.');
		} catch (err) {
			// Snapshots are in Preview — may not be available in all regions/configs.
			console.log(`      Snapshot failed (Preview feature — may not be available): ${err instanceof Error ? err.message : String(err)}`);
		}
	} finally {
		// Clean up
		console.log('\n\nCleaning up...');
		await sandbox.destroy();
		console.log('Sandbox destroyed.');
	}
}

// ── Demo: Interactions API (agent-driven) ─────────────────────

async function interactionsDemo(): Promise<void> {
	console.log('\n');
	console.log('='.repeat(60));
	console.log(' GEAP Managed Agents Sandbox — Interactions API Demo');
	console.log('='.repeat(60));

	const project = process.env['GOOGLE_CLOUD_PROJECT'] ?? 'your-project-id';

	const client = new GeapInteractionsClient({ project });

	// First interaction — creates a new sandbox.
	printInteraction(
		'Create files and check Python version',
		await client.interact(
			'Create a Python file at /workspace/hello.py that prints "Hello from the sandbox!" and run it. Also tell me the Python version.',
			{
				type: 'remote',
				network: { allowlist: [{ domain: '*' }] },
			},
		),
	);

	// Second interaction — reuses the same sandbox.
	printInteraction(
		'Install numpy and compute statistics (multi-turn)',
		await client.interact(
			'Install numpy with pip, then write a script that generates 100 random numbers and prints their mean, median, and standard deviation. Run it.',
		),
	);

	// Third interaction — check state persistence.
	printInteraction(
		'Verify state persistence',
		await client.interact(
			'List all files in /workspace and show me the contents of hello.py that we created earlier.',
		),
	);

	console.log(`\nEnvironment ID for reuse: ${client.envId}`);
	console.log('This environment persists for 7 days (TTL resets on each interaction).');
}

// ── Main ──────────────────────────────────────────────────────

async function main(): Promise<void> {
	const mode = process.argv[2] ?? 'scale';

	switch (mode) {
		case 'scale':
			await scaleSandboxDemo();
			break;
		case 'interactions':
			await interactionsDemo();
			break;
		case 'both':
			await scaleSandboxDemo();
			await interactionsDemo();
			break;
		default:
			console.log('Usage: pnpm demo [scale|interactions|both]');
			console.log('  scale        — Direct sandbox control (default)');
			console.log('  interactions — Agent-driven via Interactions API');
			console.log('  both         — Run both demos');
			process.exit(1);
	}

	console.log('\nDone.');
}

main().catch((err: unknown) => {
	console.error('Demo failed:', err);
	process.exit(1);
});
