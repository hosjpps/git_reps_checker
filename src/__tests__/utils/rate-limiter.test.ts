import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/utils/rate-limiter';

describe('Rate Limiter', () => {
  beforeEach(() => {
    // Reset rate limiter state between tests by using unique IPs
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should allow requests within limit', () => {
    const ip = `test-ip-${Date.now()}-${Math.random()}`;

    for (let i = 0; i < RATE_LIMIT_CONFIG.maxRequests; i++) {
      const result = checkRateLimit(ip);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(RATE_LIMIT_CONFIG.maxRequests - i - 1);
    }
  });

  it('should block requests over limit', () => {
    const ip = `test-ip-block-${Date.now()}-${Math.random()}`;

    // Use up all requests
    for (let i = 0; i < RATE_LIMIT_CONFIG.maxRequests; i++) {
      checkRateLimit(ip);
    }

    // Next request should be blocked
    const result = checkRateLimit(ip);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.resetIn).toBeGreaterThan(0);
  });

  it('should reset after window expires', () => {
    const ip = `test-ip-reset-${Date.now()}-${Math.random()}`;

    // Use up all requests
    for (let i = 0; i < RATE_LIMIT_CONFIG.maxRequests; i++) {
      checkRateLimit(ip);
    }

    // Should be blocked
    expect(checkRateLimit(ip).allowed).toBe(false);

    // Advance time past the window
    vi.advanceTimersByTime(RATE_LIMIT_CONFIG.windowMs + 1000);

    // Should be allowed again
    const result = checkRateLimit(ip);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(RATE_LIMIT_CONFIG.maxRequests - 1);
  });

  it('should track different IPs separately', () => {
    const ip1 = `test-ip-1-${Date.now()}`;
    const ip2 = `test-ip-2-${Date.now()}`;

    // Use up all requests for ip1
    for (let i = 0; i < RATE_LIMIT_CONFIG.maxRequests; i++) {
      checkRateLimit(ip1);
    }

    // ip1 should be blocked
    expect(checkRateLimit(ip1).allowed).toBe(false);

    // ip2 should still be allowed
    expect(checkRateLimit(ip2).allowed).toBe(true);
  });
});
