/**
 * Central tool call dispatcher.
 *
 * Registers the CallToolRequest handler on the MCP server and routes each
 * incoming tool name to the correct domain handler via the ApiClient.
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { ApiClient } from '../tools/api-client.js';
import { ToolError, type formatToolResult } from '../mcp-error.js';
import { graphHandlers } from '../tools/graph-tools.js';
import { specHandlers } from '../tools/spec-tools.js';
import { ragHandlers } from '../tools/rag-tools.js';
import { planHandlers } from '../tools/plan-tools.js';

type ToolHandler = (
  api: ApiClient,
  args: Record<string, unknown>,
) => Promise<ReturnType<typeof formatToolResult>>;

const allHandlers: Record<string, ToolHandler> = {
  ...graphHandlers,
  ...specHandlers,
  ...ragHandlers,
  ...planHandlers,
};

export function registerCallToolHandler(
  server: Server,
  apiClient: ApiClient,
): void {
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: rawArgs } = request.params;
    const args = (rawArgs ?? {}) as Record<string, unknown>;

    const handler = allHandlers[name];

    if (!handler) {
      throw new ToolError({
        code: 'VALIDATION_ERROR',
        message: `Unknown tool: ${name}`,
        retryable: false,
        suggestion: 'Use tools/list to see available tools.',
      });
    }

    try {
      return await handler(apiClient, args);
    } catch (err: unknown) {
      if (err instanceof ToolError) {
        return err.toToolResult();
      }

      const message = err instanceof Error ? err.message : 'Unknown error';
      const toolErr = new ToolError({
        code: 'INTERNAL_ERROR',
        message,
        retryable: false,
      });
      return toolErr.toToolResult();
    }
  });
}
