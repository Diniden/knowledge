/**
 * MCP server factory.
 *
 * Creates a configured MCP Server instance with all tool definitions
 * registered and the call-tool dispatcher wired up.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ApiClient } from './tools/api-client.js';
import type { ApiClientOptions } from './tools/api-client.js';
import { GRAPH_TOOL_DEFINITIONS } from './tools/graph-tools.js';
import { SPEC_TOOL_DEFINITIONS } from './tools/spec-tools.js';
import { RAG_TOOL_DEFINITIONS } from './tools/rag-tools.js';
import { PLAN_TOOL_DEFINITIONS } from './tools/plan-tools.js';
import { registerCallToolHandler } from './handlers/call-tool.js';

export interface McpServerOptions {
  api?: ApiClientOptions;
}

export function createMcpServer(opts?: McpServerOptions): Server {
  const server = new Server(
    {
      name: 'knowledge-graph-tools',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  const allTools = [
    ...GRAPH_TOOL_DEFINITIONS,
    ...SPEC_TOOL_DEFINITIONS,
    ...RAG_TOOL_DEFINITIONS,
    ...PLAN_TOOL_DEFINITIONS,
  ];

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: allTools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  }));

  const apiClient = new ApiClient(opts?.api);
  registerCallToolHandler(server, apiClient);

  return server;
}
