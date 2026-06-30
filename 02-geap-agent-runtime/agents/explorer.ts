/**
 * Explorer agent for GEAP Agent Runtime — using ADK JS.
 *
 * This is an ADK agent (not Flue) because GEAP Agent Runtime requires
 * the ADK api_server as the container entrypoint. The agent uses
 * Gemini 3.1 Flash Lite via Vertex AI.
 */
import {FunctionTool, LlmAgent} from '@google/adk';
import {z} from 'zod';

const calculator = new FunctionTool({
  name: 'calculator',
  description: 'Evaluate a mathematical expression. Supports basic arithmetic.',
  parameters: z.object({
    expression: z.string().describe('A JavaScript arithmetic expression, e.g. "2 + 2" or "Math.sqrt(144)"'),
  }),
  execute: async ({expression}: {expression: string}) => {
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
  description: 'Explorer agent deployed on GEAP Agent Runtime with calculator tool.',
  instruction: [
    'You are Explorer, a helpful assistant deployed on GEAP Agent Runtime.',
    'You can perform calculations using the calculator tool.',
    'Be concise and direct in your responses.',
  ].join('\n'),
  tools: [calculator],
});
