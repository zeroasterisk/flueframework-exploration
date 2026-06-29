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

const currentTime = defineTool({
	name: 'current_time',
	description: 'Get the current date and time in ISO 8601 format.',
	input: v.object({}),
	run: async () => {
		return new Date().toISOString();
	},
});

const assistantProfile = defineAgentProfile({
	instructions: [
		'You are Assistant, a helpful AI agent accessible via the A2A protocol.',
		'You can perform calculations using the calculator tool and check the current time.',
		'Be concise and direct in your responses.',
		'When asked to do math, use the calculator tool rather than computing in your head.',
	].join('\n'),
});

export default defineAgent(() => ({
	profile: assistantProfile,
	model: 'anthropic/claude-sonnet-4-6',
	tools: [calculator, currentTime],
	sandbox: local(),
}));
