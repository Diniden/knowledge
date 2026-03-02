# Skill: Create MCP Tool

> Add a new tool to the application's MCP server for use by the runtime agent system.

**Important**: This skill creates tools for the **APPLICATION's agent system** (runtime), not development tools. The tools defined here are exposed via MCP servers and consumed by the deployed AI agents that serve end users. See `BOUNDARY.md` for the full dev-vs-runtime boundary reference.

## When to Use

- Adding a new capability to the runtime agent system's MCP servers
- The agent needs to perform a new operation (query knowledge graph, manage specs, etc.)
- You need to expose existing server logic as an MCP tool

## Prerequisites

- `bun install` has been run in the workspace root
- The target MCP server exists in `packages/mcp-servers/` or `server/src/modules/`
- You understand the MCP tool protocol (tool name, description, input schema, handler)
- The underlying business logic exists or will be created alongside the tool

## Inputs

| Input         | Example                                        | Required |
| ------------- | ---------------------------------------------- | -------- |
| `toolName`    | `search-knowledge-graph`                       | Yes      |
| `description` | `Search the knowledge graph by semantic query` | Yes      |
| `mcpServer`   | Target MCP server package or module            | Yes      |
| `inputSchema` | JSON Schema for tool parameters                | Yes      |
| `permissions` | What the tool is allowed to access             | Yes      |

## Steps

### 1. Define the tool specification

Document the tool before implementing it:

```typescript
// Tool: {toolName}
// Description: {description}
// Input Schema:
// {
//   "type": "object",
//   "properties": {
//     "query": { "type": "string", "description": "Search query" },
//     "limit": { "type": "number", "description": "Max results", "default": 10 }
//   },
//   "required": ["query"]
// }
// Output: Array of matching knowledge graph nodes
// Permissions: read-only access to knowledge graph
```

### 2. Add the tool definition

In the target MCP server, add the tool to the tool registry:

```typescript
// packages/mcp-servers/{server}/src/tools/{tool-name}.ts

import type { McpToolDefinition } from '../types.js';

export const {toolNameCamel}Tool: McpToolDefinition = {
  name: '{tool-name}',
  description: '{description}',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return',
        default: 10,
      },
    },
    required: ['query'],
  },
};
```

### 3. Implement the handler

```typescript
// packages/mcp-servers/{server}/src/handlers/{tool-name}.handler.ts

import { Logger } from '@nestjs/common';

import type { {ToolInput}, {ToolOutput} } from '../types.js';

const logger = new Logger('{tool-name}-handler');

export async function handle{ToolNamePascal}(
  input: {ToolInput},
): Promise<{ToolOutput}> {
  logger.log(`Executing {tool-name} with query="${input.query}"`);

  // 1. Validate input beyond schema validation
  if (input.limit !== undefined && input.limit > 100) {
    throw new Error('Limit must not exceed 100');
  }

  // 2. Execute the operation
  const results = await performOperation(input);

  // 3. Format and return results
  return {
    results,
    count: results.length,
  };
}
```

### 4. Add permission checks

Ensure the tool respects the agent's permission scope:

```typescript
export async function handle{ToolNamePascal}(
  input: {ToolInput},
  context: ToolContext,
): Promise<{ToolOutput}> {
  if (!context.permissions.includes('{required-permission}')) {
    throw new Error('Insufficient permissions for {tool-name}');
  }

  // ... handler logic
}
```

### 5. Register the tool

Add the tool to the MCP server's tool manifest:

```typescript
// packages/mcp-servers/{server}/src/index.ts
import { {toolNameCamel}Tool } from './tools/{tool-name}.js';
import { handle{ToolNamePascal} } from './handlers/{tool-name}.handler.js';

server.registerTool({toolNameCamel}Tool, handle{ToolNamePascal});
```

### 6. Create integration test

```typescript
// packages/mcp-servers/{server}/src/handlers/{tool-name}.handler.test.ts
import { describe, expect, test } from 'bun:test';

import { handle{ToolNamePascal} } from './{tool-name}.handler.js';

describe('{tool-name} handler', () => {
  test('returns results for valid query', async () => {
    const result = await handle{ToolNamePascal}(
      { query: 'test query', limit: 5 },
      { permissions: ['{required-permission}'] },
    );

    expect(result.results).toBeDefined();
    expect(Array.isArray(result.results)).toBe(true);
    expect(result.count).toBeLessThanOrEqual(5);
  });

  test('rejects when missing required permission', async () => {
    await expect(
      handle{ToolNamePascal}(
        { query: 'test' },
        { permissions: [] },
      ),
    ).rejects.toThrow('Insufficient permissions');
  });

  test('validates limit bounds', async () => {
    await expect(
      handle{ToolNamePascal}(
        { query: 'test', limit: 999 },
        { permissions: ['{required-permission}'] },
      ),
    ).rejects.toThrow('Limit must not exceed');
  });
});
```

### 7. Update the tool manifest documentation

If the MCP server has a manifest or README, add the new tool to the list of available tools with its description and input schema.

## Validation

1. **Tool registers**: MCP server starts without errors and lists the new tool
2. **Schema validates**: invalid input is rejected before the handler runs
3. **Handler executes**: valid input produces expected output
4. **Permissions enforced**: unauthorized calls are rejected
5. **Tests pass**: `bun test packages/mcp-servers/{server}/`
6. **Manifest updated**: tool appears in the server's tool list

## Common Issues

| Problem                                  | Resolution                                                                                               |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Tool not appearing in MCP tool list      | Ensure the tool is registered in the server's `index.ts` or tool registry                                |
| Input schema validation not running      | Check that the MCP framework validates input against `inputSchema` before calling handler                |
| Handler crashes on edge case input       | Add explicit input validation at the start of the handler, beyond JSON Schema                            |
| Permission check bypassed                | Ensure `context.permissions` is populated from the agent's session, not hardcoded                        |
| Tool works in tests but fails at runtime | Check that all dependencies (DB connections, services) are available in the MCP server's runtime context |
