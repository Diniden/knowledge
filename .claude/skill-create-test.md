# Skill: Create Tests

> Create unit, integration, or E2E tests for any module in the project.

## When to Use

- Adding tests for new or existing code
- A module lacks adequate test coverage
- You need to verify behavior after a refactor

## Prerequisites

- `bun install` has been run in the workspace root
- The target source file exists and compiles
- For integration tests: PostgreSQL is running
- For E2E tests: Playwright is installed (`bun run setup` includes this)

## Inputs

| Input        | Example                                   | Required |
| ------------ | ----------------------------------------- | -------- |
| `targetFile` | `server/src/modules/auth/auth.service.ts` | Yes      |
| `testType`   | `unit`, `integration`, or `e2e`           | Yes      |

---

## Unit Tests

Co-located next to the source file as `{source-file}.test.ts`.

### Steps

#### 1. Create the test file

Place the test file next to the source:

```
{targetFile}          → source
{targetFile%.ts}.test.ts  → test
```

Example: `auth.service.ts` → `auth.service.test.ts`

#### 2. Write the test structure

```typescript
import { describe, expect, test, beforeEach, mock } from 'bun:test';

import { {ClassName} } from './{source-file}.js';

describe('{ClassName}', () => {
  let instance: {ClassName};

  beforeEach(() => {
    // Arrange: create fresh instance with mock dependencies
    instance = new {ClassName}(/* mocked deps */);
  });

  describe('{methodName}', () => {
    test('returns expected result on valid input', () => {
      // Arrange
      const input = { /* valid input */ };

      // Act
      const result = instance.{methodName}(input);

      // Assert
      expect(result).toEqual(/* expected */);
    });

    test('throws on invalid input', () => {
      expect(() => instance.{methodName}(null)).toThrow();
    });

    test('handles edge case: empty input', () => {
      const result = instance.{methodName}({});
      expect(result).toBeUndefined();
    });
  });
});
```

#### 3. Cover these scenarios

1. **Happy path** — valid input produces expected output
2. **Edge cases** — empty input, boundary values, maximum lengths
3. **Error cases** — invalid input, missing required fields, unauthorized
4. **State transitions** — for stores: before/after action calls

#### 4. Mock external boundaries only

```typescript
const mockDb = {
  query: mock(() => Promise.resolve([{ id: '1', title: 'Test' }])),
};

const mockHttpClient = {
  get: mock(() => Promise.resolve({ data: [] })),
};
```

Never mock internal modules. Only mock: HTTP clients, database connections, file system, external APIs.

---

## Integration Tests

Located in `server/test/integration/` — test full request/response cycles through NestJS.

### Steps

#### 1. Create the test file — `server/test/integration/{module}.integration.test.ts`

```typescript
import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';

import { AppModule } from '../../src/app.module.js';

describe('{Module} Integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  test('POST /{resources} creates a new {resource}', async () => {
    const response = await fetch(`http://localhost:${port}/{resources}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title: 'Integration Test {Resource}' }),
    });

    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body.id).toBeDefined();
    expect(body.title).toBe('Integration Test {Resource}');
  });

  test('GET /{resources}/:id returns the created {resource}', async () => {
    const response = await fetch(
      `http://localhost:${port}/{resources}/${createdId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    expect(response.status).toBe(200);
  });

  test('returns 401 without auth token', async () => {
    const response = await fetch(`http://localhost:${port}/{resources}`);
    expect(response.status).toBe(401);
  });
});
```

#### 2. Set up test database

Integration tests should use a separate test database. Ensure `server/.env.test` has a dedicated `DATABASE_URL`.

#### 3. Add setup/teardown

Clean up created records after tests to avoid flaky state between test runs.

---

## E2E Tests

Located in `e2e/` at the project root — test full user flows through the browser with Playwright.

### Steps

#### 1. Create the test file — `e2e/{feature}.e2e.test.ts`

```typescript
import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import { chromium, type Browser, type Page } from 'playwright';

describe('{Feature} E2E', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch();
    page = await browser.newPage();
  });

  afterAll(async () => {
    await browser.close();
  });

  test('user can {action}', async () => {
    await page.goto('http://localhost:5173/{route}');

    // Interact
    await page.fill('[data-testid="{input-name}"]', 'Test Value');
    await page.click('[data-testid="{submit-button}"]');

    // Assert
    await expect(page.locator('[data-testid="{result}"]')).toHaveText(
      'Test Value',
    );
  });
});
```

#### 2. Add data-testid attributes

Components under test need `data-testid` attributes for reliable selectors. Add them to the component if missing.

#### 3. Manage test state

E2E tests should seed their own data via API calls in `beforeAll`, and clean up in `afterAll`.

---

## Validation

1. **Tests pass**: `bun test {test-file}` exits successfully
2. **No false positives**: break the code intentionally and verify the test catches it
3. **Coverage**: critical paths (happy, error, edge) are covered
4. **Isolation**: tests don't depend on execution order or shared mutable state
5. **Speed**: unit tests < 100ms each, integration < 5s, E2E < 30s

## Common Issues

| Problem                                     | Resolution                                                                 |
| ------------------------------------------- | -------------------------------------------------------------------------- |
| Import errors in test file                  | Ensure `.js` extensions in all relative imports (ESM)                      |
| Test database not found                     | Check `DATABASE_URL` in `.env.test`; run `bun run migrate` against test DB |
| MobX "action required" error in tests       | Wrap state mutations in `runInAction()` or call action methods directly    |
| Playwright timeout                          | Increase timeout or add explicit `waitForSelector` before assertions       |
| Test passes in isolation but fails in suite | State leaking between tests — ensure `beforeEach` resets all shared state  |
