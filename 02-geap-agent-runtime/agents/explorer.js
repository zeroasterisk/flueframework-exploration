import {FunctionTool, LlmAgent} from '@google/adk';
import {z} from 'zod';

const calculator = new FunctionTool({
  name: 'calculator',
  description: 'Evaluate a mathematical expression.',
  parameters: z.object({
    expression: z.string().describe('A JS arithmetic expression, e.g. "2 + 2"'),
  }),
  execute: async ({expression}) => {
    try {
      const result = Function('"use strict"; return (' + expression + ')')();
      return {status: 'success', result: String(result)};
    } catch (e) {
      return {status: 'error', error: String(e)};
    }
  },
});

export const rootAgent = new LlmAgent({
  name: 'explorer',
  model: process.env.FLUE_MODEL || 'gemini-3.1-flash-lite',
  description: 'Explorer agent on GEAP with calculator tool.',
  instruction: 'You are Explorer. Use the calculator tool for math. Be concise.',
  tools: [calculator],
});
