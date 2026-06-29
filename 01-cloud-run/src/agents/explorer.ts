import { defineAgent, defineAgentProfile, defineTool } from '@flue/runtime';
import { local } from '@flue/runtime/node';
import * as v from 'valibot';

const calculator = defineTool({
	name: 'calculator',
	description:
		'Evaluate a mathematical expression. Supports basic arithmetic (+, -, *, /, **, %). Returns the numeric result as a string.',
	input: v.object({
		expression: v.pipe(
			v.string(),
			v.description(
				'A JavaScript arithmetic expression to evaluate, e.g. "2 + 2" or "Math.sqrt(144)"',
			),
		),
	}),
	run: async ({ input }) => {
		const result = Function(`"use strict"; return (${input.expression})`)();
		return String(result);
	},
});

const explorerProfile = defineAgentProfile({
	instructions: [
		'You are Explorer, a helpful assistant deployed on Google Cloud Run.',
		'You can perform calculations using the calculator tool.',
		'Be concise and direct in your responses.',
	].join('\n'),
});

export default defineAgent(() => ({
	profile: explorerProfile,
	model: 'anthropic/claude-sonnet-4-6',
	tools: [calculator],
	sandbox: local(),
}));
