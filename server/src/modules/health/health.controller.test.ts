import { describe, expect, test } from 'bun:test';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  const controller = new HealthController();

  describe('check', () => {
    test('returns ok status', () => {
      const result = controller.check();
      expect(result.status).toBe('ok');
    });

    test('returns a valid ISO timestamp', () => {
      const result = controller.check();
      const date = new Date(result.timestamp);
      expect(date.toISOString()).toBe(result.timestamp);
    });

    test('returns a numeric uptime', () => {
      const result = controller.check();
      expect(typeof result.uptime).toBe('number');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });
  });
});
