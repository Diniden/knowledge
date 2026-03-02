#!/usr/bin/env bun
/**
 * Entry point for the Knowledge Graph MCP server.
 *
 * Starts the server on stdio transport so it can be spawned as a child
 * process by Claude Code (or any MCP client).
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './server.js';

async function main(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  // Graceful shutdown on SIGINT / SIGTERM
  const shutdown = async () => {
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

main().catch((err: unknown) => {
  console.error('MCP server failed to start:', err);
  process.exit(1);
});
