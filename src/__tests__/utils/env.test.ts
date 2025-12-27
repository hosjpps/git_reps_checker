import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getMissingEnvVars, isEnvConfigured } from '@/lib/utils/env';

describe('Environment Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getMissingEnvVars', () => {
    it('should return empty array when all required vars are set', () => {
      process.env.OPENROUTER_API_KEY = 'sk-or-test-key';
      expect(getMissingEnvVars()).toEqual([]);
    });

    it('should return missing vars when OPENROUTER_API_KEY is not set', () => {
      delete process.env.OPENROUTER_API_KEY;
      expect(getMissingEnvVars()).toContain('OPENROUTER_API_KEY');
    });
  });

  describe('isEnvConfigured', () => {
    it('should return true when OPENROUTER_API_KEY is set', () => {
      process.env.OPENROUTER_API_KEY = 'sk-or-test-key';
      expect(isEnvConfigured()).toBe(true);
    });

    it('should return false when OPENROUTER_API_KEY is not set', () => {
      delete process.env.OPENROUTER_API_KEY;
      expect(isEnvConfigured()).toBe(false);
    });
  });
});
