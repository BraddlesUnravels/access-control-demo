import { describe, expect, it } from 'vitest';
import { createInMemoryRateLimiter } from '@/lib/rate-limiter/in-memory';

describe('createInMemoryRateLimiter', () => {
  it('should allow requests up to and including the configured limit', () => {
    const limiter = createInMemoryRateLimiter({
      maxRequests: 3,
      windowMs: 60_000,
    });

    expect(limiter.consume('client-a', 1_000)).toEqual({
      allowed: true,
      remaining: 2,
      retryAfterSeconds: 60,
    });

    expect(limiter.consume('client-a', 2_000)).toEqual({
      allowed: true,
      remaining: 1,
      retryAfterSeconds: 59,
    });

    expect(limiter.consume('client-a', 3_000)).toEqual({
      allowed: true,
      remaining: 0,
      retryAfterSeconds: 58,
    });
  });

  it('should reject the first request above the configured limit', () => {
    const limiter = createInMemoryRateLimiter({
      maxRequests: 3,
      windowMs: 60_000,
    });

    limiter.consume('client-a', 1_000);
    limiter.consume('client-a', 2_000);
    limiter.consume('client-a', 3_000);

    expect(limiter.consume('client-a', 4_000)).toEqual({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 57,
    });
  });

  it('should start a new window after the existing window expires', () => {
    const limiter = createInMemoryRateLimiter({
      maxRequests: 1,
      windowMs: 60_000,
    });

    expect(limiter.consume('client-a', 1_000).allowed).toBe(true);

    expect(limiter.consume('client-a', 2_000).allowed).toBe(false);

    expect(limiter.consume('client-a', 61_000)).toEqual({
      allowed: true,
      remaining: 0,
      retryAfterSeconds: 60,
    });
  });

  it('should maintain independent limits for separate clients', () => {
    const limiter = createInMemoryRateLimiter({
      maxRequests: 1,
      windowMs: 60_000,
    });

    expect(limiter.consume('client-a', 1_000).allowed).toBe(true);

    expect(limiter.consume('client-a', 2_000).allowed).toBe(false);

    expect(limiter.consume('client-b', 2_000).allowed).toBe(true);
  });

  it('should round Retry-After up to the next whole second', () => {
    const limiter = createInMemoryRateLimiter({
      maxRequests: 1,
      windowMs: 60_000,
    });

    limiter.consume('client-a', 1_000);

    const result = limiter.consume('client-a', 31_001);

    expect(result).toEqual({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 30,
    });
  });

  it('should prune expired clients before using the overflow bucket', () => {
    const limiter = createInMemoryRateLimiter({
      maxRequests: 2,
      windowMs: 1_000,
      maxTrackedClients: 1,
    });

    limiter.consume('client-a', 1_000);

    const result = limiter.consume('client-b', 2_000);

    expect(result).toEqual({
      allowed: true,
      remaining: 1,
      retryAfterSeconds: 1,
    });

    expect(limiter.consume('client-b', 2_001)).toMatchObject({
      allowed: true,
      remaining: 0,
    });
  });

  it('should share an overflow bucket when the tracked-client limit is reached', () => {
    const limiter = createInMemoryRateLimiter({
      maxRequests: 2,
      windowMs: 60_000,
      maxTrackedClients: 1,
    });

    limiter.consume('existing-client', 1_000);

    expect(limiter.consume('overflow-client-a', 2_000)).toMatchObject({
      allowed: true,
      remaining: 1,
    });

    expect(limiter.consume('overflow-client-b', 3_000)).toMatchObject({
      allowed: true,
      remaining: 0,
    });

    expect(limiter.consume('overflow-client-c', 4_000)).toMatchObject({
      allowed: false,
      remaining: 0,
    });
  });

  it('should keep the blocked request count capped above the configured limit', () => {
    const limiter = createInMemoryRateLimiter({
      maxRequests: 1,
      windowMs: 60_000,
    });

    limiter.consume('client-a', 1_000);

    const firstBlocked = limiter.consume('client-a', 2_000);
    const secondBlocked = limiter.consume('client-a', 3_000);
    const thirdBlocked = limiter.consume('client-a', 4_000);

    expect(firstBlocked.allowed).toBe(false);
    expect(secondBlocked.allowed).toBe(false);
    expect(thirdBlocked.allowed).toBe(false);

    expect(firstBlocked.remaining).toBe(0);
    expect(secondBlocked.remaining).toBe(0);
    expect(thirdBlocked.remaining).toBe(0);
  });
});
