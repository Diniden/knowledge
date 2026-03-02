import { type User } from '@kg/shared';
import { type Spec, PermissionLevel } from '@kg/shared';
import { type Edge, EdgeType } from '@kg/shared';

let counter = 0;
function nextId() {
  return ++counter;
}

export function resetFactoryCounter() {
  counter = 0;
}

export function createTestUser(overrides?: Partial<User>): User {
  const n = nextId();
  return {
    id: `user-${n}`,
    username: `testuser${n}`,
    email: `testuser${n}@example.com`,
    displayName: `Test User ${n}`,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createTestSpec(overrides?: Partial<Spec>): Spec {
  const n = nextId();
  return {
    id: `spec_test${n.toString().padStart(16, '0')}`,
    title: `Test Spec ${n}`,
    content: `Content for test spec ${n}`,
    authorId: `user-1`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    commitHash: `abc${n.toString().padStart(37, '0')}`,
    tags: ['test'],
    permissionLevel: PermissionLevel.FULL_ACCESS,
    documentId: `doc_test${n.toString().padStart(16, '0')}`,
    mediaAssociations: [],
    ...overrides,
  };
}

export function createTestEdge(overrides?: Partial<Edge>): Edge {
  const n = nextId();
  return {
    id: `edge_test${n.toString().padStart(15, '0')}`,
    sourceSpecId: `spec_source${n.toString().padStart(10, '0')}`,
    targetSpecId: `spec_target${n.toString().padStart(10, '0')}`,
    type: EdgeType.RELATED_TO,
    metadata: { description: `Test edge ${n}` },
    createdAt: new Date().toISOString(),
    createdBy: `user-1`,
    commitHash: `def${n.toString().padStart(37, '0')}`,
    ...overrides,
  };
}
