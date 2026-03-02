# Skill: Systematic Debugging

> Follow a structured process to identify, isolate, and fix bugs with a regression test.

## When to Use

- An error or unexpected behavior has been reported or observed
- A test is failing and the cause is not immediately obvious
- A runtime exception, type error, or logic bug needs investigation

## Prerequisites

- You can reproduce the issue or have a clear error message / stack trace
- `bun install` has been run in the workspace root
- Access to logs (server logs, browser console, or test output)

## Inputs

| Input          | Example                                                         | Required                     |
| -------------- | --------------------------------------------------------------- | ---------------------------- |
| `errorMessage` | `TypeError: Cannot read properties of undefined (reading 'id')` | Yes (or symptom description) |
| `context`      | Where the error occurs: endpoint, component, test, etc.         | Yes                          |

## Steps

### 1. Read the error carefully

Parse the full error output:

- **Error type**: `TypeError`, `ReferenceError`, `HttpException`, `ValidationError`, etc.
- **Message**: what specifically failed
- **Stack trace**: which file and line number originated the error
- **Context**: which module, endpoint, or component was involved

### 2. Identify the failing module

From the stack trace, determine:

- Which workspace: `client/`, `server/`, `shared/`?
- Which module: `auth/`, `knowledge-graph/`, `rag/`?
- Which file and function: exact location of the throw

### 3. Check recent changes

```bash
git log --oneline -10
git diff HEAD~3 -- {affected-file-or-directory}
```

If the bug appeared recently, recent commits are the most likely cause.

### 4. Form a hypothesis

Based on steps 1-3, form a specific hypothesis:

> "The `specId` field is undefined because the API response changed shape and the client is not handling the new format."

A good hypothesis is **specific** and **falsifiable**.

### 5. Reproduce with a minimal test

Write a focused test that triggers the exact failure:

```typescript
import { describe, expect, test } from 'bun:test';

import { {functionUnderTest} } from './{source-file}.js';

describe('Bug: {brief description}', () => {
  test('reproduces the issue', () => {
    // Arrange: set up the exact conditions that trigger the bug
    const input = { /* minimal failing input */ };

    // Act & Assert: verify the bug manifests
    expect(() => {functionUnderTest}(input)).toThrow('{expected error}');
  });
});
```

Run: `bun test {test-file}` — confirm the test fails as expected.

### 6. Add targeted logging (temporary)

If the cause is still unclear, add temporary `Logger` calls (server) or `console.debug` calls (client) at key decision points. Use the NestJS `Logger` on the server side:

```typescript
this.logger.debug(`specId=${specId}, payload=${JSON.stringify(payload)}`);
```

**Never commit debug logging.** Remove it after the bug is fixed.

### 7. Fix the root cause

Apply the minimal change that fixes the issue:

- Fix the logic error, null check, type mismatch, or missing handling
- Do NOT add broad try/catch blocks to suppress the error
- Do NOT add `!` non-null assertions to silence TypeScript
- Prefer defensive checks with clear error messages over silent fallbacks

### 8. Verify the fix

Run the reproduction test — it should now pass:

```bash
bun test {test-file}
```

### 9. Convert to regression test

Update the reproduction test to serve as a permanent regression test:

```typescript
test('handles missing specId gracefully', () => {
  const input = { specId: undefined };
  const result = { functionUnderTest }(input);
  expect(result).toEqual({ error: 'specId is required' });
});
```

### 10. Run full test suite

```bash
bun test
bun run lint
```

Ensure no other tests broke from the fix.

### 11. Remove debug logging

Search for and remove any temporary logging added in step 6.

## Validation

1. **Reproduction test** exists and passes
2. **Root cause** is fixed (not masked)
3. **Full test suite** passes
4. **No debug artifacts** left in the code
5. **Lint clean**: `bun run lint` reports no new errors

## Common Patterns

| Symptom                                    | Likely Cause                                                                  | Fix                                                                 |
| ------------------------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| "Cannot read properties of undefined"      | Missing null check, optional chaining needed                                  | Add `?.` or explicit guard                                          |
| MobX "modifying observable outside action" | State mutation in callback/promise without `@action`                          | Wrap in `runInAction()` or use `@action.bound`                      |
| NestJS "Cannot resolve dependency"         | Missing provider in module `providers` array                                  | Add the service to `providers` or `imports`                         |
| Drizzle "column does not exist"            | Schema drift — migration not applied or schema out of sync                    | Run `bun run migrate` or regenerate migration                       |
| 401 on authenticated endpoint              | JWT expired, cookie not sent, guard misconfigured                             | Check token lifecycle, cookie settings, guard import                |
| DTO validation returns 400 unexpectedly    | Field name mismatch between client payload and DTO                            | Compare field names and types between client service and server DTO |
| Component not re-rendering on state change | Missing `observer()` wrapper or accessing derived value instead of observable | Wrap with `observer()` and access observables directly              |
| Import path resolution error               | Missing `.js` extension in ESM import                                         | Add `.js` extension to all relative imports                         |

## Common Issues

| Problem                            | Resolution                                                                                      |
| ---------------------------------- | ----------------------------------------------------------------------------------------------- |
| Cannot reproduce locally           | Check environment differences (env vars, DB state, Node version). Try matching production state |
| Fix breaks other tests             | The fix exposed a latent bug elsewhere. Fix that bug too — don't revert to mask it              |
| Intermittent / flaky failure       | Usually a race condition or shared mutable state. Add explicit waits or isolate state per test  |
| Error only in production build     | Likely a tree-shaking or minification issue. Test with `bun run build && bun run preview`       |
| Stack trace points to node_modules | The bug is in how you call the library, not the library itself. Check your usage against docs   |
