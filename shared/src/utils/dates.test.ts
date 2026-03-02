import { describe, expect, test } from 'bun:test';
import {
  formatRelativeTime,
  formatShortDate,
  formatISO,
  parseISO,
  isValidISODate,
} from './dates.js';

describe('formatRelativeTime', () => {
  test('returns "just now" for recent timestamps', () => {
    const now = new Date().toISOString();
    expect(formatRelativeTime(now)).toBe('just now');
  });

  test('returns minutes ago', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(fiveMinAgo)).toBe('5m ago');
  });

  test('returns hours ago', () => {
    const threeHoursAgo = new Date(
      Date.now() - 3 * 60 * 60 * 1000,
    ).toISOString();
    expect(formatRelativeTime(threeHoursAgo)).toBe('3h ago');
  });

  test('returns days ago', () => {
    const twoDaysAgo = new Date(
      Date.now() - 2 * 24 * 60 * 60 * 1000,
    ).toISOString();
    expect(formatRelativeTime(twoDaysAgo)).toBe('2d ago');
  });
});

describe('formatShortDate', () => {
  test('formats date in short US format', () => {
    const result = formatShortDate('2024-06-15T12:00:00.000Z');
    expect(result).toContain('Jun');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });
});

describe('formatISO', () => {
  test('returns ISO string for the current time when no arg given', () => {
    const result = formatISO();
    expect(isValidISODate(result)).toBe(true);
  });

  test('returns ISO string for a given date', () => {
    const date = new Date('2024-01-15T10:30:00.000Z');
    expect(formatISO(date)).toBe('2024-01-15T10:30:00.000Z');
  });
});

describe('parseISO', () => {
  test('parses valid ISO date string', () => {
    const date = parseISO('2024-06-15T12:00:00.000Z');
    expect(date).toBeInstanceOf(Date);
    expect(date.getFullYear()).toBe(2024);
  });

  test('throws on invalid date string', () => {
    expect(() => parseISO('not-a-date')).toThrow('Invalid ISO date string');
  });
});

describe('isValidISODate', () => {
  test('accepts valid ISO dates', () => {
    expect(isValidISODate('2024-06-15T12:00:00.000Z')).toBe(true);
  });

  test('rejects invalid dates', () => {
    expect(isValidISODate('not-a-date')).toBe(false);
    expect(isValidISODate('')).toBe(false);
  });

  test('rejects non-ISO formatted valid dates', () => {
    expect(isValidISODate('June 15, 2024')).toBe(false);
  });
});
