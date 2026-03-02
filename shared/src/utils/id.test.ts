import { describe, expect, test } from 'bun:test';
import {
  generateId,
  generateSpecId,
  generateEdgeId,
  generateDocumentId,
  generateSessionId,
  generatePlanId,
} from './id.js';

describe('generateId', () => {
  test('returns a non-empty string', () => {
    const id = generateId();
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
  });

  test('respects custom size', () => {
    const id = generateId(10);
    expect(id).toHaveLength(10);
  });

  test('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

describe('generateSpecId', () => {
  test('starts with spec_ prefix', () => {
    expect(generateSpecId()).toMatch(/^spec_/);
  });

  test('has correct total length (5 prefix + 16 nanoid)', () => {
    expect(generateSpecId()).toHaveLength(5 + 16);
  });
});

describe('generateEdgeId', () => {
  test('starts with edge_ prefix', () => {
    expect(generateEdgeId()).toMatch(/^edge_/);
  });

  test('has correct total length (5 prefix + 16 nanoid)', () => {
    expect(generateEdgeId()).toHaveLength(5 + 16);
  });
});

describe('generateDocumentId', () => {
  test('starts with doc_ prefix', () => {
    expect(generateDocumentId()).toMatch(/^doc_/);
  });

  test('has correct total length (4 prefix + 16 nanoid)', () => {
    expect(generateDocumentId()).toHaveLength(4 + 16);
  });
});

describe('generateSessionId', () => {
  test('starts with sess_ prefix', () => {
    expect(generateSessionId()).toMatch(/^sess_/);
  });

  test('has correct total length (5 prefix + 16 nanoid)', () => {
    expect(generateSessionId()).toHaveLength(5 + 16);
  });
});

describe('generatePlanId', () => {
  test('starts with plan_ prefix', () => {
    expect(generatePlanId()).toMatch(/^plan_/);
  });

  test('has correct total length (5 prefix + 16 nanoid)', () => {
    expect(generatePlanId()).toHaveLength(5 + 16);
  });
});
