# Skill: Create Drizzle ORM Migration

> Create a database migration using Drizzle ORM: update schema, generate SQL, review, and apply.

## When to Use

- Adding a new table or modifying an existing table in PostgreSQL
- Adding indexes, constraints, or pgvector columns
- Any structural change to the database schema

## Prerequisites

- `bun install` has been run in the workspace root
- PostgreSQL is running and accessible
- Drizzle ORM config exists at `server/drizzle.config.ts`
- Database connection env vars are set (check `server/.env`)

## Inputs

| Input           | Example                                | Required |
| --------------- | -------------------------------------- | -------- |
| `description`   | `add-spec-versions-table`              | Yes      |
| `schemaChanges` | New table, add column, add index, etc. | Yes      |

## Steps

### 1. Update the schema definition

Edit or create the schema file in `server/src/db/schema/`:

**New table example — `server/src/db/schema/{table-name}.ts`:**

```typescript
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  index,
} from 'drizzle-orm/pg-core';

export const { tableName } = pgTable(
  '{table_name}',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status').notNull().default('draft'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    titleIdx: index('{table_name}_title_idx').on(table.title),
    statusIdx: index('{table_name}_status_idx').on(table.status),
  }),
);
```

**With foreign key:**

```typescript
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

import { specs } from './specs.js';

export const specVersions = pgTable('spec_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  specId: uuid('spec_id')
    .notNull()
    .references(() => specs.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
```

**With pgvector column:**

```typescript
import { pgTable, uuid, text } from 'drizzle-orm/pg-core';
import { vector } from 'drizzle-orm/pg-core';

export const embeddings = pgTable('embeddings', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceId: uuid('source_id').notNull(),
  embedding: vector('embedding', { dimensions: 768 }).notNull(),
});
```

### 2. Re-export from schema barrel

Ensure the new schema file is exported from `server/src/db/schema/index.ts`:

```typescript
export { {tableName} } from './{table-name}.js';
```

### 3. Generate the migration

```bash
cd server && bun drizzle-kit generate
```

This creates a new SQL file in `server/src/db/migrations/` (or the configured migrations folder).

### 4. Review the generated SQL

Read the generated `.sql` file. Verify:

- Table/column names match expectations
- Indexes are present
- Foreign key constraints and `ON DELETE` behavior are correct
- No unintended `DROP` statements

### 5. Apply the migration

```bash
cd server && bun run migrate
```

### 6. Create seed data (if applicable)

Add seed data for the new table in `server/src/db/seed/`:

```typescript
// server/src/db/seed/{table-name}.seed.ts
import { db } from '../connection.js';
import { {tableName} } from '../schema/{table-name}.js';

export async function seed{TableName}() {
  await db.insert({tableName}).values([
    { title: 'Sample 1', status: 'active' },
    { title: 'Sample 2', status: 'draft' },
  ]);
}
```

### 7. Test the migration

Write a basic test to verify the schema works:

```typescript
// server/src/db/schema/{table-name}.test.ts
import { describe, expect, test } from 'bun:test';

import { {tableName} } from './{table-name}.js';

describe('{tableName} schema', () => {
  test('table has expected columns', () => {
    const columns = Object.keys({tableName});
    expect(columns).toContain('id');
    expect(columns).toContain('title');
    expect(columns).toContain('createdAt');
  });
});
```

## Validation

1. **Migration applies**: `bun run migrate` exits without errors
2. **Schema matches**: database table matches the Drizzle schema definition
3. **Seed runs**: `bun run seed` populates the table (if seed created)
4. **Tests pass**: `bun test server/src/db/`
5. **No drift**: `bun drizzle-kit check` reports no schema drift (if available)

## Common Issues

| Problem                                             | Resolution                                                                                            |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Migration fails with "relation already exists"      | A previous partial migration may have applied. Check `drizzle` migrations table and manually resolve  |
| Foreign key constraint error on seed                | Insert parent records before child records. Ensure referenced IDs exist                               |
| pgvector column type not recognized                 | Ensure `pg_vector` extension is enabled: `CREATE EXTENSION IF NOT EXISTS vector`                      |
| Generated SQL drops a column unexpectedly           | Review schema diff carefully. Rename operations generate drop+create by default — may need manual SQL |
| Type mismatch between Drizzle schema and TypeScript | Run `bun drizzle-kit introspect` to compare actual DB state with declared schema                      |
