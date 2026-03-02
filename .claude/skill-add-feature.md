# Skill: Add Full-Stack Feature

> Orchestrate a complete vertical slice — from shared types through database, server, store, and UI — using sub-skills for each layer.

## When to Use

- Implementing a new feature that touches multiple layers (frontend, backend, shared, database)
- Building a complete CRUD workflow for a new entity
- Any change that requires coordinated modifications across workspaces

## Prerequisites

- `bun install` has been run in the workspace root
- All existing tests pass: `bun test`
- You have a clear understanding of the feature requirements
- Database is running (if feature involves persistence)

## Inputs

| Input          | Example                           | Required |
| -------------- | --------------------------------- | -------- |
| `featureName`  | `spec-versioning`                 | Yes      |
| `entities`     | `SpecVersion`                     | Yes      |
| `operations`   | `create`, `list`, `get`, `delete` | Yes      |
| `uiComponents` | `VersionList`, `VersionDetail`    | Yes      |

## Steps

### 1. Plan the feature

Before writing code, map out the full vertical slice:

- **Shared types**: What interfaces/DTOs cross the workspace boundary?
- **Database**: What tables/columns are needed?
- **Server**: What endpoints, services, and guards are needed?
- **Client store**: What observable state, actions, and computeds are needed?
- **Client UI**: What components render the feature?
- **Tests**: What are the critical paths to test at each layer?

Document the plan briefly (even inline comments are fine) before proceeding.

### 2. Shared types → `shared/src/`

Define types that both client and server will use:

```typescript
// shared/src/types/{entity}.types.ts
export interface {Entity} {
  id: string;
  // ... fields
  createdAt: string;
  updatedAt: string;
}

// shared/src/dto/{action}-{entity}.dto.ts
export interface Create{Entity}Request {
  // ... request fields
}

export interface {Entity}Response {
  // ... response fields
}
```

Re-export from `shared/src/index.ts`.

### 3. Database → use `skill-create-migration.md`

Follow the migration skill to:

1. Define the Drizzle schema in `server/src/db/schema/`
2. Generate and review the migration SQL
3. Apply the migration
4. Create seed data

### 4. Server → use `skill-create-api-endpoint.md`

Follow the API endpoint skill for each operation:

1. Create DTOs with `class-validator`
2. Implement service methods with business logic
3. Add controller methods with Swagger decorators
4. Add auth guards
5. Write service and controller tests

**Repeat for each operation** (create, list, get, update, delete).

### 5. Client service → `client/ui/src/services/`

Create the API client service that calls the server endpoints:

```typescript
// client/ui/src/services/{entity}.service.ts
import type { Create{Entity}Request, {Entity}Response } from '@kg/shared';

const BASE_URL = '/api/{entities}';

export const {entity}Service = {
  async getAll(): Promise<{Entity}Response[]> {
    const res = await fetch(BASE_URL);
    if (!res.ok) throw new Error(`Failed to fetch {entities}`);
    return res.json();
  },

  async getById(id: string): Promise<{Entity}Response> {
    const res = await fetch(`${BASE_URL}/${id}`);
    if (!res.ok) throw new Error(`{Entity} not found`);
    return res.json();
  },

  async create(data: Create{Entity}Request): Promise<{Entity}Response> {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to create {entity}`);
    return res.json();
  },

  async delete(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete {entity}`);
  },
};
```

### 6. Client store → use `skill-create-store.md`

Follow the store skill to:

1. Create the store with observable state for the entity
2. Add load, create, update, delete actions
3. Add computed values (sorted, filtered, selected)
4. Register in RootStore
5. Write store tests

### 7. Client components → use `skill-create-component.md`

Follow the component skill for each UI piece:

1. List component (container — uses `observer`)
2. Detail/card component (leaf or container)
3. Create/edit form component (container)

Wire components to the store through container components that use `observer` and pass data via props to leaf components.

### 8. Integration test

Create an integration test that exercises the full flow:

```typescript
// server/test/integration/{feature}.integration.test.ts
describe('{Feature} full flow', () => {
  test('create → read → update → delete', async () => {
    // Create
    const created = await createEntity({ title: 'Test' });
    expect(created.id).toBeDefined();

    // Read
    const fetched = await getEntity(created.id);
    expect(fetched.title).toBe('Test');

    // Update
    const updated = await updateEntity(created.id, { title: 'Updated' });
    expect(updated.title).toBe('Updated');

    // Delete
    await deleteEntity(created.id);
    await expect(getEntity(created.id)).rejects.toThrow();
  });
});
```

### 9. Final validation

Run the full suite to confirm nothing is broken:

```bash
bun test
bun run lint
bun run build
```

## Validation

1. **Shared types**: imported correctly by both `@kg/server` and `@kg/client`
2. **Database**: migration applied, seed data present
3. **Server**: all endpoints respond correctly, Swagger docs render
4. **Store**: actions mutate state, computeds derive correctly
5. **UI**: components render, user interactions trigger store actions
6. **Tests**: all new tests pass, no existing tests broken
7. **Build**: `bun run build` succeeds across all workspaces

## Common Issues

| Problem                                   | Resolution                                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------------------------ |
| Shared type not found in client/server    | Ensure re-exported from `shared/src/index.ts` and workspace dependency is declared         |
| Database migration conflicts              | Pull latest, re-generate migration from current schema state                               |
| CORS error from client → server           | Check Vite proxy config in `client/ui/vite.config.ts` or NestJS CORS settings              |
| Store action not reflecting in UI         | Ensure component is wrapped with `observer()` and accessing observable properties directly |
| Circular import between service and store | Service should not import store; store calls service — one-way dependency                  |
