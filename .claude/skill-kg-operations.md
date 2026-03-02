# Skill: Knowledge Graph Module Operations

> Develop and extend the knowledge graph module code — adding operations, types, endpoints, and tests.

**Important**: This skill is for **DEVELOPING** the knowledge graph module (`server/src/modules/knowledge-graph/`). It is NOT for operating on knowledge graph data at runtime. The runtime knowledge data lives in `knowledge-graph/` at the project root and is managed by the application's agent system.

## When to Use

- Adding a new operation to the knowledge graph module (CRUD, traversal, search)
- Modifying how the KG module reads/writes spec files
- Adding validation or business rules to KG operations
- Exposing KG operations via REST or MCP

## Prerequisites

- `bun install` has been run in the workspace root
- The KG module exists at `server/src/modules/knowledge-graph/`
- You understand the KG data model: specs, relationships, metadata
- Database is running (if the operation involves persistence)

## Inputs

| Input              | Example                               | Required |
| ------------------ | ------------------------------------- | -------- |
| `operationName`    | `getSpecWithRelations`                | Yes      |
| `operationType`    | `query`, `mutation`, `traversal`      | Yes      |
| `affectedEntities` | `Spec`, `Relationship`, `SpecVersion` | Yes      |

## Steps

### 1. Define the interface in shared types

Add the operation's input/output types to `shared/src/types/`:

```typescript
// shared/src/types/knowledge-graph.types.ts

export interface GetSpecWithRelationsInput {
  specId: string;
  depth?: number;
  includeArchived?: boolean;
}

export interface SpecWithRelations {
  spec: Spec;
  parents: Relationship[];
  children: Relationship[];
  relatedSpecs: Spec[];
}
```

Re-export from `shared/src/index.ts`.

### 2. Implement the service method

Add the operation to the KG service:

```typescript
// server/src/modules/knowledge-graph/knowledge-graph.service.ts

import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import type { GetSpecWithRelationsInput, SpecWithRelations } from '@kg/shared';

@Injectable()
export class KnowledgeGraphService {
  private readonly logger = new Logger(KnowledgeGraphService.name);

  async getSpecWithRelations(
    input: GetSpecWithRelationsInput,
  ): Promise<SpecWithRelations> {
    this.logger.log(`Fetching spec with relations: ${input.specId}`);

    // 1. Fetch the spec
    const spec = await this.findSpecById(input.specId);
    if (!spec) {
      throw new NotFoundException(`Spec not found: ${input.specId}`);
    }

    // 2. Fetch relationships
    const relationships = await this.findRelationships(
      input.specId,
      input.depth ?? 1,
    );

    // 3. Filter archived if needed
    const filtered = input.includeArchived
      ? relationships
      : relationships.filter((r) => r.status !== 'archived');

    // 4. Build and return the result
    return {
      spec,
      parents: filtered.filter((r) => r.targetId === input.specId),
      children: filtered.filter((r) => r.sourceId === input.specId),
      relatedSpecs: await this.resolveRelatedSpecs(filtered, input.specId),
    };
  }
}
```

### 3. Add file I/O (if the operation touches the file-backed KG)

The knowledge graph data is stored as JSON files in `knowledge-graph/`. If the operation reads or writes these files:

```typescript
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const KG_ROOT = process.env['KNOWLEDGE_GRAPH_PATH'] ?? 'knowledge-graph';

async readSpec(specId: string): Promise<Spec> {
  const filePath = join(KG_ROOT, 'specs', `${specId}.json`);
  const raw = await readFile(filePath, 'utf-8');
  return JSON.parse(raw) as Spec;
}

async writeSpec(spec: Spec): Promise<void> {
  const dir = join(KG_ROOT, 'specs');
  await mkdir(dir, { recursive: true });
  const filePath = join(dir, `${spec.id}.json`);
  await writeFile(filePath, JSON.stringify(spec, null, 2), 'utf-8');
}
```

Always validate file paths to prevent directory traversal attacks.

### 4. Add validation

Validate inputs using the project's validation approach:

```typescript
import { z } from 'zod';

const GetSpecWithRelationsSchema = z.object({
  specId: z.string().uuid(),
  depth: z.number().int().min(0).max(5).optional(),
  includeArchived: z.boolean().optional(),
});

// In the service method:
const validated = GetSpecWithRelationsSchema.parse(input);
```

### 5. Expose via REST endpoint

Add a controller method following the `skill-create-api-endpoint.md` pattern:

```typescript
// server/src/modules/knowledge-graph/knowledge-graph.controller.ts

@Get(':id/relations')
@ApiOperation({ summary: 'Get a spec with its relations' })
async getSpecWithRelations(
  @Param('id', ParseUUIDPipe) id: string,
  @Query('depth', new DefaultValuePipe(1), ParseIntPipe) depth: number,
): Promise<SpecWithRelations> {
  return this.kgService.getSpecWithRelations({ specId: id, depth });
}
```

### 6. Expose via MCP (if needed for agent consumption)

If the runtime agents need this operation, follow `skill-create-mcp-tool.md` to add it as an MCP tool.

### 7. Write tests

```typescript
// server/src/modules/knowledge-graph/knowledge-graph.service.test.ts

describe('KnowledgeGraphService', () => {
  describe('getSpecWithRelations', () => {
    test('returns spec with parent and child relations', async () => {
      // Arrange
      const specId = 'test-spec-id';
      // ... set up mock data

      // Act
      const result = await service.getSpecWithRelations({ specId });

      // Assert
      expect(result.spec.id).toBe(specId);
      expect(result.parents).toBeDefined();
      expect(result.children).toBeDefined();
    });

    test('throws NotFoundException for missing spec', async () => {
      await expect(
        service.getSpecWithRelations({ specId: 'nonexistent' }),
      ).rejects.toThrow(NotFoundException);
    });

    test('respects depth parameter', async () => {
      const shallow = await service.getSpecWithRelations({
        specId: 'id',
        depth: 1,
      });
      const deep = await service.getSpecWithRelations({
        specId: 'id',
        depth: 3,
      });
      expect(deep.relatedSpecs.length).toBeGreaterThanOrEqual(
        shallow.relatedSpecs.length,
      );
    });

    test('filters archived relations by default', async () => {
      const result = await service.getSpecWithRelations({ specId: 'id' });
      const hasArchived = [...result.parents, ...result.children].some(
        (r) => r.status === 'archived',
      );
      expect(hasArchived).toBe(false);
    });
  });
});
```

## Validation

1. **Types compile**: `bun run build` succeeds with new shared types
2. **Service works**: operation produces correct results for valid input
3. **Validation rejects bad input**: invalid specId, negative depth, etc. are caught
4. **File I/O safe**: no directory traversal, handles missing files gracefully
5. **Endpoint responds**: REST endpoint returns correct status codes and shapes
6. **Tests pass**: `bun test server/src/modules/knowledge-graph/`
7. **Lint clean**: `bun run lint` reports no new errors

## Common Issues

| Problem                                                  | Resolution                                                                                             |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| File not found when reading KG data                      | Check `KNOWLEDGE_GRAPH_PATH` env var; ensure the spec JSON file exists                                 |
| Circular relationships cause infinite recursion          | Add a `visited` set to traversal algorithms and cap depth                                              |
| Type mismatch between file JSON and TypeScript interface | Add runtime validation (zod) when parsing JSON from files                                              |
| Concurrent file writes corrupt data                      | Use file locking or queue writes; consider moving to DB-backed storage for high-concurrency operations |
| Relationship references a deleted spec                   | Add referential integrity checks; handle dangling references gracefully                                |
