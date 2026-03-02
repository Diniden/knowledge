# Add Full-Stack Feature

> Orchestrate a complete vertical slice: shared types, database, server endpoint, MobX store, React component, and tests.

## When to Use

- Implementing a new user-facing feature that spans frontend and backend
- Adding a new entity with CRUD operations
- Any task requiring coordinated changes across multiple workspaces

## Prerequisites

- Feature requirements are understood (what the user will see and do)
- The feature name and scope are defined
- Database schema changes are identified (if any)

## Steps

1. **Plan the feature** — Use TodoWrite to create a task list tracking each layer:

   ```
   TodoWrite:
   - [ ] Define shared types and DTOs
   - [ ] Create database migration (if needed)
   - [ ] Create/update server module
   - [ ] Create API endpoint(s)
   - [ ] Create client service
   - [ ] Create MobX store
   - [ ] Create React component(s)
   - [ ] Write tests for each layer
   - [ ] Integration test
   ```

2. **Define shared types** — Create types in `shared/src/types/` and DTOs in `shared/src/dto/`:
   - Use Write to create type files
   - Use StrReplace to add exports to barrel files
   - Follow the `create-api-endpoint` skill for DTO patterns

3. **Database migration** (if needed) — Create a Drizzle migration:
   - Use Read to inspect existing schema in `server/src/db/schema/`
   - Add new table or columns
   - Use Shell to run: `bun run migrate`

4. **Server module** — Follow the `create-module` skill if the module is new, or `create-api-endpoint` if adding to an existing module:
   - Create service with business logic
   - Create controller with route handlers
   - Create DTOs with validation

5. **Client service** — Use Write to create `client/ui/src/services/{feature}.service.ts`:
   - Follow patterns in `.cursor/rules/frontend-services.mdc`
   - Use the shared `httpClient`
   - Return typed responses

6. **MobX store** — Follow the `create-store` skill:
   - Create store in the appropriate category
   - Register in RootStore
   - Add actions that call the client service

7. **React components** — Follow the `create-component` skill for each component:
   - Start with the container component (uses `observer()`)
   - Create leaf components (props-driven)
   - Wire up to the store via the container

8. **Write tests** — Follow the `create-test` skill for each layer:
   - Service unit tests (server)
   - Controller unit tests (server)
   - Store unit tests (client)
   - Component tests (client)
   - Integration test if applicable

9. **Run full test suite** — Use Shell:

   ```
   Shell: bun test
   Shell: bun run lint
   Shell: bun run build
   ```

10. **Update TodoWrite** — Mark all tasks complete.

## Validation

- [ ] Shared types are in `@kg/shared` and used by both client and server
- [ ] Database migration runs cleanly (if applicable)
- [ ] Server endpoint responds correctly (test via Shell with `curl` or via test)
- [ ] Client store loads data and updates state
- [ ] Components render correctly with store data
- [ ] All tests pass across all workspaces
- [ ] `bun run lint` passes
- [ ] `bun run build` succeeds

## Common Issues

| Problem                                 | Resolution                                                       |
| --------------------------------------- | ---------------------------------------------------------------- |
| Type mismatch between client and server | Ensure both import from `@kg/shared`, not local copies           |
| Store not updating component            | Verify component is wrapped with `observer()`                    |
| API returns 500                         | Check server logs; verify DTO validation and service logic       |
| Build fails after changes               | Run `bun run build` — shared must build before server and client |

## References

- `.cursor/skills/create-component/SKILL.md`
- `.cursor/skills/create-store/SKILL.md`
- `.cursor/skills/create-api-endpoint/SKILL.md`
- `.cursor/skills/create-module/SKILL.md`
- `.cursor/skills/create-test/SKILL.md`
- `.cursor/rules/project-structure.mdc`
