import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ValidationError } from '@kg/shared';
import { SpecsFileService } from './specs-file.service.js';
import type { Spec } from '@kg/shared';

function makeTestSpec(id: string): Spec {
  return {
    id,
    title: `Test Spec ${id}`,
    content: `# Test Spec ${id}\n\nThis is test content.`,
    authorId: 'user-1',
    version: 1,
    commitHash: 'abc123',
    tags: ['test'],
    permissionLevel: 'full' as Spec['permissionLevel'],
    documentId: 'doc-1',
    mediaAssociations: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

describe('SpecsFileService', () => {
  let service: SpecsFileService;
  let projectPath: string;

  beforeAll(async () => {
    service = new SpecsFileService();
    projectPath = await mkdtemp(join(tmpdir(), 'kg-specs-test-'));
    await mkdir(join(projectPath, 'knowledge-graph', 'specs'), {
      recursive: true,
    });
  });

  afterAll(async () => {
    await rm(projectPath, { recursive: true, force: true });
  });

  test('should write and read a spec', async () => {
    const spec = makeTestSpec('sp-001');

    await service.writeSpec(projectPath, 'doc-1', 'sp-001', spec);
    const loaded = await service.readSpec(projectPath, 'doc-1', 'sp-001');

    expect(loaded.id).toBe('sp-001');
    expect(loaded.title).toBe('Test Spec sp-001');
    expect(loaded.content).toContain('test content');
  });

  test('should delete a spec', async () => {
    const spec = makeTestSpec('sp-del');
    await service.writeSpec(projectPath, 'doc-1', 'sp-del', spec);

    let exists = await service.specExists(projectPath, 'doc-1', 'sp-del');
    expect(exists).toBe(true);

    await service.deleteSpec(projectPath, 'doc-1', 'sp-del');

    exists = await service.specExists(projectPath, 'doc-1', 'sp-del');
    expect(exists).toBe(false);
  });

  test('should list specs in a document', async () => {
    await service.writeSpec(
      projectPath,
      'doc-list',
      'sp-a',
      makeTestSpec('sp-a'),
    );
    await service.writeSpec(
      projectPath,
      'doc-list',
      'sp-b',
      makeTestSpec('sp-b'),
    );
    await service.writeSpec(
      projectPath,
      'doc-list',
      'sp-c',
      makeTestSpec('sp-c'),
    );

    const ids = await service.listSpecsInDocument(projectPath, 'doc-list');
    expect(ids).toContain('sp-a');
    expect(ids).toContain('sp-b');
    expect(ids).toContain('sp-c');
    expect(ids).toHaveLength(3);
  });

  test('should reject path traversal attempts', () => {
    expect(service.readSpec(projectPath, '../etc', 'sp-001')).rejects.toThrow(
      ValidationError,
    );

    expect(
      service.readSpec(projectPath, 'doc-1', '../../passwd'),
    ).rejects.toThrow(ValidationError);
  });

  test('should use atomic writes (tmp file rename)', async () => {
    const spec = makeTestSpec('sp-atomic');
    await service.writeSpec(projectPath, 'doc-atomic', 'sp-atomic', spec);

    const loaded = await service.readSpec(
      projectPath,
      'doc-atomic',
      'sp-atomic',
    );
    expect(loaded.id).toBe('sp-atomic');
  });

  test('should return empty list for non-existent document', async () => {
    const ids = await service.listSpecsInDocument(
      projectPath,
      'non-existent-doc',
    );
    expect(ids).toEqual([]);
  });

  test('should handle specExists for non-existent spec', async () => {
    const exists = await service.specExists(
      projectPath,
      'doc-1',
      'non-existent',
    );
    expect(exists).toBe(false);
  });
});
