import { describe, it, expect, beforeEach } from 'vitest';
import { AnalysisCache } from '@/lib/utils/cache';

describe('AnalysisCache', () => {
  let cache: AnalysisCache<{ data: string }>;

  beforeEach(() => {
    cache = new AnalysisCache<{ data: string }>({ maxEntries: 3, ttlMs: 1000 });
  });

  describe('generateKey', () => {
    it('should generate consistent keys for same input', () => {
      const key1 = AnalysisCache.generateKey('https://github.com/user/repo', 'abc123');
      const key2 = AnalysisCache.generateKey('https://github.com/user/repo', 'abc123');
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different repos', () => {
      const key1 = AnalysisCache.generateKey('https://github.com/user/repo1', 'abc123');
      const key2 = AnalysisCache.generateKey('https://github.com/user/repo2', 'abc123');
      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different commits', () => {
      const key1 = AnalysisCache.generateKey('https://github.com/user/repo', 'abc123');
      const key2 = AnalysisCache.generateKey('https://github.com/user/repo', 'def456');
      expect(key1).not.toBe(key2);
    });

    it('should be case-insensitive for URLs', () => {
      const key1 = AnalysisCache.generateKey('https://GitHub.com/User/Repo', 'abc123');
      const key2 = AnalysisCache.generateKey('https://github.com/user/repo', 'abc123');
      expect(key1).toBe(key2);
    });
  });

  describe('set and get', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', { data: 'value1' });
      expect(cache.get('key1')).toEqual({ data: 'value1' });
    });

    it('should return null for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('should overwrite existing values', () => {
      cache.set('key1', { data: 'value1' });
      cache.set('key1', { data: 'value2' });
      expect(cache.get('key1')).toEqual({ data: 'value2' });
    });
  });

  describe('has', () => {
    it('should return true for existing keys', () => {
      cache.set('key1', { data: 'value1' });
      expect(cache.has('key1')).toBe(true);
    });

    it('should return false for non-existent keys', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should remove entries', () => {
      cache.set('key1', { data: 'value1' });
      cache.delete('key1');
      expect(cache.has('key1')).toBe(false);
    });
  });

  describe('eviction at capacity', () => {
    it('should evict when max entries exceeded', () => {
      cache.set('key1', { data: 'value1' });
      cache.set('key2', { data: 'value2' });
      cache.set('key3', { data: 'value3' });
      cache.set('key4', { data: 'value4' }); // Should evict one entry

      // Cache should have exactly 3 entries (maxEntries)
      const stats = cache.stats();
      expect(stats.size).toBe(3);

      // key4 should definitely exist
      expect(cache.has('key4')).toBe(true);
    });
  });

  describe('TTL expiration', () => {
    it('should expire entries after TTL', async () => {
      const shortCache = new AnalysisCache<{ data: string }>({ maxEntries: 10, ttlMs: 50 });
      shortCache.set('key1', { data: 'value1' });

      expect(shortCache.get('key1')).toEqual({ data: 'value1' });

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 60));

      expect(shortCache.get('key1')).toBeNull();
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      cache.set('key1', { data: 'value1' });
      cache.set('key2', { data: 'value2' });
      cache.clear();

      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
    });
  });

  describe('stats', () => {
    it('should return cache statistics', () => {
      cache.set('key1', { data: 'value1' });
      const stats = cache.stats();

      expect(stats.size).toBe(1);
      expect(stats.maxEntries).toBe(3);
      expect(stats.ttlMs).toBe(1000);
    });
  });
});
