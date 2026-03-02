import { describe, expect, test } from 'bun:test';
import {
  isValidSpecId,
  isValidEdgeType,
  isValidPermissionLevel,
  isValidEmail,
  isValidUUID,
  isNonEmptyString,
  isValidUsername,
} from './validation.js';

describe('isValidSpecId', () => {
  test('accepts valid spec ids', () => {
    expect(isValidSpecId('spec_abc123')).toBe(true);
    expect(isValidSpecId('spec_xxxxxxxxxxxxxxxx')).toBe(true);
  });

  test('rejects ids without spec_ prefix', () => {
    expect(isValidSpecId('edge_abc123')).toBe(false);
    expect(isValidSpecId('abc123')).toBe(false);
  });

  test('rejects empty or short strings', () => {
    expect(isValidSpecId('')).toBe(false);
    expect(isValidSpecId('spec_')).toBe(false);
  });
});

describe('isValidEdgeType', () => {
  test('accepts all valid edge types', () => {
    expect(isValidEdgeType('DERIVED_FROM')).toBe(true);
    expect(isValidEdgeType('DEPENDS_ON')).toBe(true);
    expect(isValidEdgeType('RELATED_TO')).toBe(true);
    expect(isValidEdgeType('CONTRADICTS')).toBe(true);
    expect(isValidEdgeType('SUPERSEDES')).toBe(true);
  });

  test('rejects invalid edge types', () => {
    expect(isValidEdgeType('INVALID')).toBe(false);
    expect(isValidEdgeType('')).toBe(false);
  });
});

describe('isValidPermissionLevel', () => {
  test('accepts valid permission levels', () => {
    expect(isValidPermissionLevel('FULL_ACCESS')).toBe(true);
    expect(isValidPermissionLevel('SUMMARY_ACCESS')).toBe(true);
  });

  test('rejects invalid levels', () => {
    expect(isValidPermissionLevel('ADMIN')).toBe(false);
    expect(isValidPermissionLevel('')).toBe(false);
  });
});

describe('isValidEmail', () => {
  test('accepts valid emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('test.user+tag@domain.co')).toBe(true);
  });

  test('rejects invalid emails', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('@missing.local')).toBe(false);
    expect(isValidEmail('missing@.domain')).toBe(false);
  });
});

describe('isValidUUID', () => {
  test('accepts valid UUIDs', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isValidUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
  });

  test('rejects invalid UUIDs', () => {
    expect(isValidUUID('')).toBe(false);
    expect(isValidUUID('not-a-uuid')).toBe(false);
    expect(isValidUUID('550e8400-e29b-61d4-a716-446655440000')).toBe(false);
  });
});

describe('isNonEmptyString', () => {
  test('accepts non-empty strings', () => {
    expect(isNonEmptyString('hello')).toBe(true);
    expect(isNonEmptyString(' a ')).toBe(true);
  });

  test('rejects empty or whitespace-only strings', () => {
    expect(isNonEmptyString('')).toBe(false);
    expect(isNonEmptyString('   ')).toBe(false);
  });

  test('rejects non-string values', () => {
    expect(isNonEmptyString(null)).toBe(false);
    expect(isNonEmptyString(undefined)).toBe(false);
    expect(isNonEmptyString(42)).toBe(false);
  });
});

describe('isValidUsername', () => {
  test('accepts valid usernames', () => {
    expect(isValidUsername('john_doe')).toBe(true);
    expect(isValidUsername('user-123')).toBe(true);
    expect(isValidUsername('abc')).toBe(true);
  });

  test('rejects too short usernames', () => {
    expect(isValidUsername('ab')).toBe(false);
    expect(isValidUsername('')).toBe(false);
  });

  test('rejects too long usernames', () => {
    expect(isValidUsername('a'.repeat(31))).toBe(false);
  });

  test('rejects usernames with special characters', () => {
    expect(isValidUsername('user@name')).toBe(false);
    expect(isValidUsername('user name')).toBe(false);
  });
});
