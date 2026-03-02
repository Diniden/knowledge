# Systematic Debugging

> Diagnose and fix bugs using a structured approach: reproduce, isolate, understand, fix, verify.

## When to Use

- A test is failing and the cause is not immediately obvious
- A runtime error or unexpected behavior is reported
- A build or lint error is difficult to trace
- Performance issues need investigation

## Prerequisites

- A clear description of the bug or unexpected behavior
- Steps to reproduce (if runtime), or the failing test/error message

## Steps

1. **Capture the error** — Use Shell to reproduce and capture the full error:

   ```
   Shell: bun test {failing-test-file}
   Shell: bun run build 2>&1
   ```

   Save the full error output including stack traces.

2. **Read the stack trace** — Use Read to open files mentioned in the stack trace, starting from the top (most recent call):

   ```
   Read: {file-from-stack-trace} (at the line number mentioned)
   ```

3. **Search for the error source** — Use Grep to find related code:

   ```
   Grep: pattern="{error message or symbol}" path={relevant-directory}
   Grep: pattern="{function name from stack trace}"
   ```

4. **Check recent changes** — Use Shell to see what changed recently:

   ```
   Shell: git log --oneline -10
   Shell: git diff HEAD~3 -- {suspected-file}
   Shell: git log --oneline --all -- {suspected-file}
   ```

5. **Form a hypothesis** — Based on the error, stack trace, and code:
   - What is the expected behavior?
   - What is actually happening?
   - What changed that could cause this?

6. **Isolate the issue** — Narrow down the cause:
   - Use Read to examine the specific function or module
   - Use Grep to check how the problematic code is called
   - Check types and interfaces for mismatches

7. **Apply the fix** — Use StrReplace to make targeted changes:
   - Fix only the root cause, not symptoms
   - Maintain existing code style and conventions
   - Add error context if the failure was silent

8. **Verify the fix** — Use Shell to confirm:

   ```
   Shell: bun test {failing-test-file}
   Shell: bun test
   Shell: bun run lint
   Shell: bun run build
   ```

9. **Add a regression test** — If no test covered this case, use Write to add one:
   - The test should fail without the fix and pass with it
   - Follow the `create-test` skill for conventions

## Validation

- [ ] Root cause identified and documented (in commit message or code comment if non-obvious)
- [ ] Fix addresses root cause, not just symptoms
- [ ] Original failing test now passes
- [ ] No new test failures introduced
- [ ] Regression test added if gap existed
- [ ] `bun run lint` and `bun run build` pass

## Common Issues

| Problem                               | Resolution                                                             |
| ------------------------------------- | ---------------------------------------------------------------------- |
| Stack trace points to compiled output | Map back to TypeScript source using the file path                      |
| Error only in production build        | Check for ESM/CJS mismatches or missing `.js` extensions               |
| Flaky test (passes sometimes)         | Look for race conditions, shared mutable state, or timing dependencies |
| Error in dependency                   | Check version, look for known issues, consider pinning or patching     |

## References

- `.cursor/rules/general.mdc` — Error handling conventions
- `.cursor/rules/server.mdc` — Server error patterns
