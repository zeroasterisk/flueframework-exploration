#!/usr/bin/env tsx
/**
 * Demo: GEAP Code Execution Sandbox
 *
 * Creates a sandbox, runs Python snippets, and cleans up.
 *
 * Usage:
 *   export GOOGLE_CLOUD_PROJECT=alanblount-demo
 *   export GOOGLE_ACCESS_TOKEN=$(gcloud auth print-access-token)
 *   pnpm demo
 */

import { GeapSandbox } from './geap-sandbox.ts';
import type { ExecutionResult } from './geap-sandbox.ts';

// ── Helpers ───────────────────────────────────────────────────

function printResult(label: string, result: ExecutionResult): void {
	console.log(`\n${'─'.repeat(60)}`);
	console.log(`▶ ${label}`);
	console.log(`${'─'.repeat(60)}`);

	if (result.stdout) {
		console.log(result.stdout.trimEnd());
	}
	if (result.stderr) {
		console.log(`[stderr] ${result.stderr.trimEnd()}`);
	}
	console.log(`Exit status: ${result.exitStatus}`);
}

// ── Demo snippets ─────────────────────────────────────────────

const SNIPPETS: Array<{ label: string; code: string }> = [
	{
		label: 'Basic arithmetic',
		code: `
import math
print(f"π ≈ {math.pi}")
print(f"e ≈ {math.e}")
print(f"√2 ≈ {math.sqrt(2)}")
print(f"2^10 = {2**10}")
`.trim(),
	},
	{
		label: 'File operations (sandbox-local)',
		code: `
# Write a file inside the sandbox
with open("/tmp/hello.txt", "w") as f:
    f.write("Hello from GEAP sandbox!\\n")
    f.write("This file lives inside the sandbox environment.\\n")

# Read it back
with open("/tmp/hello.txt", "r") as f:
    print(f.read())
`.trim(),
	},
	{
		label: 'List installed packages',
		code: `
import pkg_resources
packages = sorted(pkg_resources.working_set, key=lambda p: p.project_name.lower())
print(f"Installed packages ({len(packages)}):")
for p in packages[:20]:
    print(f"  {p.project_name} {p.version}")
if len(packages) > 20:
    print(f"  ... and {len(packages) - 20} more")
`.trim(),
	},
	{
		label: 'Data processing with stdlib',
		code: `
import json
import statistics

data = [23, 45, 12, 67, 34, 89, 56, 78, 90, 11]
stats = {
    "count": len(data),
    "mean": statistics.mean(data),
    "median": statistics.median(data),
    "stdev": round(statistics.stdev(data), 2),
    "min": min(data),
    "max": max(data),
}
print(json.dumps(stats, indent=2))
`.trim(),
	},
	{
		label: 'Error handling',
		code: `
import sys

# This will print to stderr
print("This goes to stderr", file=sys.stderr)

# This will print to stdout
print("This goes to stdout")

# Non-zero exit won't kill the sandbox — it's per-execution
`.trim(),
	},
];

// ── Main ──────────────────────────────────────────────────────

async function main(): Promise<void> {
	console.log('🔧 GEAP Code Execution Sandbox Demo');
	console.log('====================================\n');

	const sandbox = new GeapSandbox({
		project: process.env['GOOGLE_CLOUD_PROJECT'] ?? 'alanblount-demo',
		region: 'us-central1',
	});

	try {
		// Create sandbox
		console.log('Creating sandbox...');
		const name = await sandbox.createSandbox();
		console.log(`✓ Sandbox created: ${name}\n`);

		// Run each snippet
		for (const snippet of SNIPPETS) {
			const result = await sandbox.executeCode(snippet.code);
			printResult(snippet.label, result);
		}

		// Demonstrate state persistence within the sandbox
		console.log(`\n${'─'.repeat(60)}`);
		console.log('▶ State persistence test');
		console.log(`${'─'.repeat(60)}`);

		await sandbox.executeCode('x = 42');
		const persistence = await sandbox.executeCode('print(f"x is still {x}")');
		if (persistence.stdout.includes('42')) {
			console.log('✓ State persists across executions');
			console.log(persistence.stdout.trimEnd());
		} else {
			console.log('✗ State did NOT persist (unexpected)');
			console.log(persistence.stdout.trimEnd());
		}
	} finally {
		// Clean up
		console.log('\n\nCleaning up...');
		await sandbox.destroy();
		console.log('✓ Sandbox destroyed');
	}

	console.log('\nDone.');
}

main().catch((err: unknown) => {
	console.error('Demo failed:', err);
	process.exit(1);
});
