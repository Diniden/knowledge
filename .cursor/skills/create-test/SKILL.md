# Create Tests

> Write unit, integration, or E2E tests for existing code using bun:test and project conventions.

## When to Use

- Adding tests for new or existing code
- Increasing test coverage for a module
- Writing integration tests that span multiple services
- Creating E2E tests with Playwright

## Prerequisites

- The source code to test exists and is functional
- You understand the expected behavior of the code under test
- For integration tests: database or external service access is available
- For E2E tests: Playwright is configured

## Steps

### Unit Tests

1. **Read the source file** — Use Read to understand the module's public API:

   ```
   Read: {path-to-source-file}
   ```

2. **Find existing tests for patterns** — Use Glob to locate nearby test files:

   ```
   Glob: {directory}/**/*.test.ts
   ```

3. **Create the test file** — Use Write to create `{source-file}.test.ts` co-located with the source:

   ```typescript
   import { describe, test, expect, beforeEach } from 'bun:test';

   import { {ClassOrFunction} } from './{source-file}.js';

   describe('{ClassOrFunction}', () => {
     // Arrange shared fixtures
     let subject: {ClassOrFunction};

     beforeEach(() => {
       subject = new {ClassOrFunction}(/* mock dependencies */);
     });

     test('describes expected behavior', () => {
       // Arrange
       const input = { /* ... */ };

       // Act
       const result = subject.method(input);

       // Assert
       expect(result).toEqual(/* expected */);
     });

     test('throws when given invalid input', () => {
       expect(() => subject.method(null)).toThrow();
     });
   });
   ```

4. **Cover key scenarios** — Each test should cover one of:
   - Happy path (expected inputs produce expected outputs)
   - Edge cases (empty arrays, null values, boundary conditions)
   - Error cases (invalid input, missing data, unauthorized access)
   - State transitions (for stores: before/after action calls)

5. **Run the test** — Use Shell:
   ```
   Shell: bun test {path-to-test-file}
   ```

### Integration Tests (Server)

1. **Create integration test** — Use Write to create `{feature}.integration.test.ts`:
   - Use NestJS `Test.createTestingModule` with real providers where possible
   - Mock only external boundaries (HTTP calls, file system)
   - Test cross-service interactions

### E2E Tests

1. **Create E2E test** — Use Write to create in the E2E test directory:
   - Use Playwright's `test` and `expect`
   - Test user-facing workflows end-to-end
   - Use page objects for maintainability

### Component Tests (Frontend)

1. **Create component test** — Use Write to create `{Component}.test.tsx`:
   - Use `@testing-library/react` for rendering
   - Test what the user sees, not implementation details
   - Use `screen.getByRole`, `screen.getByText` for queries
   - Use `fireEvent` or `userEvent` for interactions

   ```tsx
   import { describe, test, expect } from 'bun:test';
   import { render, screen, fireEvent } from '@testing-library/react';

   import { {Component} } from './{Component}.js';

   describe('{Component}', () => {
     test('renders the title', () => {
       render(<{Component} title="Hello" />);
       expect(screen.getByText('Hello')).toBeTruthy();
     });

     test('calls onSelect when clicked', () => {
       let called = false;
       render(<{Component} onSelect={() => { called = true; }} />);
       fireEvent.click(screen.getByRole('button'));
       expect(called).toBe(true);
     });
   });
   ```

## Validation

- [ ] Tests are co-located with source files
- [ ] Uses `bun:test` — not Jest or Vitest
- [ ] Follows AAA pattern: Arrange, Act, Assert
- [ ] Test names describe behavior, not implementation
- [ ] No `any` types in test code
- [ ] Mocks only external boundaries — uses DI for internal deps
- [ ] All tests pass: `bun test {path}`

## Common Issues

| Problem                           | Resolution                                      |
| --------------------------------- | ----------------------------------------------- |
| Import errors in test             | Ensure `.js` extensions in relative imports     |
| Mock not resetting                | Use `beforeEach` to reset mocks between tests   |
| Async test timing out             | Return the promise or use `async`/`await`       |
| Component test can't find element | Use `screen.debug()` to inspect rendered output |
| NestJS test module errors         | Ensure all required providers are mocked        |

## References

- `.cursor/rules/general.mdc` — Testing conventions (AAA, bun:test)
- `.cursor/rules/server.mdc` — Server test patterns
- `.cursor/rules/frontend-components.mdc` — Component test patterns
