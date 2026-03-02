# Create MobX Store

> Scaffold a new MobX store with explicit decorators, RootStore registration, and co-located test.

## When to Use

- Adding a new domain store (`stores/domain/`) for a backend entity
- Adding a new session store (`stores/session/`) for auth or user state
- Adding a new UI store (`stores/ui/`) for transient application state

## Prerequisites

- You know which store category: `domain/`, `session/`, or `ui/`
- The store name follows convention: `{EntityName}Store` (e.g., `SpecStore`, `AuthStore`, `UILayoutStore`)
- The RootStore exists at `client/ui/src/stores/root.store.ts`

## Steps

1. **Inspect existing stores** — Use Read to examine the RootStore and an existing store for patterns:

   ```
   Read: client/ui/src/stores/root.store.ts
   Glob: client/ui/src/stores/**/*.store.ts
   ```

2. **Check shared types** — Use Grep to find relevant types in `@kg/shared`:

   ```
   Grep: pattern="export.*{EntityName}" path=shared/src/types/
   ```

3. **Create the store file** — Use Write to create `{EntityName}.store.ts` in the appropriate category directory:
   - Import `makeObservable`, `observable`, `action`, `computed`, `runInAction` from `mobx`
   - Import the `RootStore` type
   - Use explicit decorators: `@observable accessor`, `@computed`, `@action.bound`
   - Call `makeObservable(this)` in constructor
   - Use `runInAction` for state updates after `await`

   ```typescript
   import { makeObservable, observable, action, computed, runInAction } from 'mobx';

   import type { RootStore } from '../root.store.js';

   export class {EntityName}Store {
     @observable accessor items: {EntityType}[] = [];
     @observable accessor loading = false;
     @observable accessor error: string | null = null;

     constructor(private readonly rootStore: RootStore) {
       makeObservable(this);
     }

     @computed get sortedItems(): {EntityType}[] {
       return [...this.items].sort((a, b) => a.name.localeCompare(b.name));
     }

     @action.bound async loadItems(): Promise<void> {
       this.loading = true;
       this.error = null;
       try {
         const result = await {service}.getAll();
         runInAction(() => { this.items = result; });
       } catch (err: unknown) {
         runInAction(() => { this.error = err instanceof Error ? err.message : 'Unknown error'; });
       } finally {
         runInAction(() => { this.loading = false; });
       }
     }
   }
   ```

4. **Register in RootStore** — Use Read then StrReplace to add the store to `root.store.ts`:
   - Add import for the new store class
   - Add property declaration and initialization in constructor

5. **Create the test file** — Use Write to create `{EntityName}.store.test.ts`:
   - Mock the RootStore dependency
   - Test computed properties
   - Test action state transitions
   - Test error handling

   ```typescript
   import { describe, test, expect } from 'bun:test';
   import { {EntityName}Store } from './{EntityName}.store.js';

   function createStore() {
     const rootStore = {} as RootStore;
     return new {EntityName}Store(rootStore);
   }

   describe('{EntityName}Store', () => {
     test('initializes with empty state', () => {
       const store = createStore();
       expect(store.items).toEqual([]);
       expect(store.loading).toBe(false);
     });

     test('sets loading to true when loading starts', () => {
       const store = createStore();
       store.loadItems();
       expect(store.loading).toBe(true);
     });
   });
   ```

6. **Run tests** — Use Shell to verify:
   ```
   Shell: bun test client/ui/src/stores/{category}/{EntityName}.store.test.ts
   ```

## Validation

- [ ] Store uses explicit decorators (not `makeAutoObservable`)
- [ ] `makeObservable(this)` called in constructor
- [ ] All state mutations inside `@action` or `runInAction`
- [ ] Async actions use `runInAction` for post-await state updates
- [ ] Store registered in RootStore
- [ ] Test file co-located and passing
- [ ] No `any` types
- [ ] Relative imports use `.js` extensions

## Common Issues

| Problem                               | Resolution                                                           |
| ------------------------------------- | -------------------------------------------------------------------- |
| `enforceActions` violation at runtime | Ensure all mutations are inside `@action` methods or `runInAction`   |
| Decorator not recognized              | Verify `experimentalDecorators` is enabled in `tsconfig.json`        |
| Circular dependency with RootStore    | Use `import type` for the RootStore import                           |
| Computed not updating                 | Ensure the computed reads `@observable` properties, not plain fields |

## References

- `.cursor/rules/frontend-state.mdc` — MobX store conventions
- `.cursor/rules/frontend.mdc` — Frontend workspace conventions
