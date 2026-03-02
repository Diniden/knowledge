# Skill: Create MobX Store

> Scaffold a new MobX store with observable state, computed values, actions, and test file.

## When to Use

- Adding a new store to `client/ui/src/stores/`
- You need centralized observable state for a domain entity, session data, or UI state
- You know the store name, its category, and the entities it manages

## Prerequisites

- `bun install` has been run in the workspace root
- `mobx` is available (already in project deps)
- The `RootStore` pattern is set up in `client/ui/src/stores/`

## Inputs

| Input       | Example                      | Required |
| ----------- | ---------------------------- | -------- |
| `StoreName` | `SpecEditor`                 | Yes      |
| `category`  | `domain`, `session`, or `ui` | Yes      |
| `entities`  | `Spec`, `SpecVersion`        | Yes      |

## Steps

### 1. Create the store file — `client/ui/src/stores/{category}/{StoreName}.store.ts`

```typescript
import { makeObservable, observable, computed, action } from 'mobx';

import type { RootStore } from '../RootStore.js';
import type { {Entity} } from '@kg/shared';

export class {StoreName}Store {
  @observable accessor items: {Entity}[] = [];
  @observable accessor loading = false;
  @observable accessor error: string | null = null;
  @observable accessor selectedId: string | null = null;

  constructor(private readonly rootStore: RootStore) {
    makeObservable(this);
  }

  @computed get selected(): {Entity} | undefined {
    return this.items.find((item) => item.id === this.selectedId);
  }

  @computed get sortedItems(): {Entity}[] {
    return [...this.items].sort((a, b) => a.name.localeCompare(b.name));
  }

  @action.bound setSelected(id: string | null): void {
    this.selectedId = id;
  }

  @action.bound async load(): Promise<void> {
    this.loading = true;
    this.error = null;

    try {
      this.items = await {service}.getAll();
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Failed to load';
    } finally {
      this.loading = false;
    }
  }

  @action.bound reset(): void {
    this.items = [];
    this.loading = false;
    this.error = null;
    this.selectedId = null;
  }
}
```

### 2. Register in RootStore

Open `client/ui/src/stores/RootStore.ts` and add:

```typescript
import { {StoreName}Store } from './{category}/{StoreName}.store.js';

export class RootStore {
  // ... existing stores ...
  readonly {storeName}: {StoreName}Store;

  constructor() {
    // ... existing initializations ...
    this.{storeName} = new {StoreName}Store(this);
  }
}
```

Use camelCase for the property name (e.g., `specEditor` for `SpecEditorStore`).

### 3. Create the test file — `client/ui/src/stores/{category}/{StoreName}.store.test.ts`

```typescript
import { describe, expect, test, beforeEach } from 'bun:test';

import { {StoreName}Store } from './{StoreName}.store.js';

function createMockRootStore() {
  return {} as any; // Minimal mock for isolated store tests
}

describe('{StoreName}Store', () => {
  let store: {StoreName}Store;

  beforeEach(() => {
    store = new {StoreName}Store(createMockRootStore());
  });

  test('initializes with empty state', () => {
    expect(store.items).toEqual([]);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
    expect(store.selectedId).toBeNull();
  });

  test('setSelected updates selectedId', () => {
    store.setSelected('abc-123');
    expect(store.selectedId).toBe('abc-123');
  });

  test('selected returns matching item', () => {
    store.items = [{ id: 'abc-123', name: 'Test' }] as any;
    store.setSelected('abc-123');
    expect(store.selected?.id).toBe('abc-123');
  });

  test('selected returns undefined when no match', () => {
    store.setSelected('nonexistent');
    expect(store.selected).toBeUndefined();
  });

  test('reset clears all state', () => {
    store.items = [{ id: '1' }] as any;
    store.loading = true;
    store.error = 'something';
    store.selectedId = '1';

    store.reset();

    expect(store.items).toEqual([]);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
    expect(store.selectedId).toBeNull();
  });

  test('sortedItems returns items sorted by name', () => {
    store.items = [
      { id: '1', name: 'Banana' },
      { id: '2', name: 'Apple' },
    ] as any;

    expect(store.sortedItems[0]?.name).toBe('Apple');
    expect(store.sortedItems[1]?.name).toBe('Banana');
  });
});
```

### 4. Export from category barrel

If `client/ui/src/stores/{category}/index.ts` exists, add:

```typescript
export { {StoreName}Store } from './{StoreName}.store.js';
```

## Validation

1. **Instantiates**: store can be constructed with a mock RootStore
2. **Tests pass**: `bun test {StoreName}.store.test.ts`
3. **Actions work**: mutations only happen inside `@action` methods
4. **Computeds derive**: computed properties return correct derived values
5. **Lint**: `bun run lint` reports no new errors

## Common Issues

| Problem                                      | Resolution                                                                                                                                |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `makeObservable` throws "missing annotation" | Ensure every mutable property has `@observable accessor`, every getter has `@computed`, and every method has `@action` or `@action.bound` |
| Mutation outside action error at runtime     | Wrap state mutations in `@action` methods; `enforceActions: 'always'` is enabled project-wide                                             |
| Circular dependency between stores           | Access other stores via `this.rootStore.{otherStore}` lazily inside methods, not in the constructor                                       |
| Store not available in components            | Verify the store is registered in `RootStore` and exposed via React Context                                                               |
| Test imports fail with ESM error             | Use `.js` extensions in imports; ensure `tsconfig.json` has `module: "ESNext"`                                                            |
