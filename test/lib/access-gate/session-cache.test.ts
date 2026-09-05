import { describe, expect, it, vi } from 'vitest';
import type { AccessGateCookiePayload } from '@/lib/access-gate/cookie';
import {
  ACCESS_GATE_SESSION_REVALIDATION_INTERVAL_MS,
  createAccessGateSessionCache,
  MAX_CACHED_SESSIONS,
} from '@/lib/access-gate/session-cache';

const buildUuid = (value: number): string =>
  `${value.toString(16).padStart(8, '0')}-1111-4111-8111-111111111111`;

const buildSession = (
  expiresAtMs: number,
  inviteId = buildUuid(1),
  visitId = buildUuid(2),
): AccessGateCookiePayload => ({
  version: 2,
  inviteId,
  visitId,
  exp: Math.floor(expiresAtMs / 1000),
});

describe('lib/access-gate/session-cache', () => {
  it('should validate and cache a successful session', async () => {
    const validate = vi.fn().mockResolvedValue(true);
    const cache = createAccessGateSessionCache(validate);
    const session = buildSession(10_000_000);

    await expect(cache.hasValidSession(session, 1_000_000)).resolves.toBe(true);
    await expect(cache.hasValidSession(session, 1_000_001)).resolves.toBe(true);

    expect(validate).toHaveBeenCalledOnce();
  });

  it('should revalidate after one hour', async () => {
    const validate = vi.fn().mockResolvedValue(true);
    const cache = createAccessGateSessionCache(validate);
    const session = buildSession(10_000_000);
    const checkedAtMs = 1_000_000;

    await cache.hasValidSession(session, checkedAtMs);
    await cache.hasValidSession(
      session,
      checkedAtMs + ACCESS_GATE_SESSION_REVALIDATION_INTERVAL_MS,
    );

    expect(validate).toHaveBeenCalledTimes(2);
  });

  it('should expire the cache at the cookie expiry when it is sooner than one hour', async () => {
    const validate = vi.fn().mockResolvedValue(true);
    const cache = createAccessGateSessionCache(validate);
    const checkedAtMs = 1_000_000;
    const session = buildSession(checkedAtMs + 10_000);

    await cache.hasValidSession(session, checkedAtMs);
    await expect(
      cache.hasValidSession(session, checkedAtMs + 8_000),
    ).resolves.toBe(true);
    await expect(
      cache.hasValidSession(session, checkedAtMs + 10_000),
    ).resolves.toBe(false);

    expect(validate).toHaveBeenCalledOnce();
  });

  it('should remove rejected sessions instead of caching them', async () => {
    const validate = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const cache = createAccessGateSessionCache(validate);
    const session = buildSession(10_000_000);

    await expect(cache.hasValidSession(session, 1_000_000)).resolves.toBe(
      false,
    );
    await expect(cache.hasValidSession(session, 1_000_001)).resolves.toBe(true);

    expect(validate).toHaveBeenCalledTimes(2);
  });

  it('should remove sessions when validation throws', async () => {
    const validate = vi
      .fn()
      .mockRejectedValueOnce(new Error('RPC unavailable'))
      .mockResolvedValueOnce(true);
    const cache = createAccessGateSessionCache(validate);
    const session = buildSession(10_000_000);

    await expect(cache.hasValidSession(session, 1_000_000)).resolves.toBe(
      false,
    );
    await expect(cache.hasValidSession(session, 1_000_001)).resolves.toBe(true);

    expect(validate).toHaveBeenCalledTimes(2);
  });

  it('should deduplicate concurrent rejected validations', async () => {
    let rejectValidation: ((reason?: unknown) => void) | undefined;
    const validation = new Promise<boolean>((_resolve, reject) => {
      rejectValidation = reject;
    });
    const validate = vi.fn().mockReturnValue(validation);
    const cache = createAccessGateSessionCache(validate);
    const session = buildSession(10_000_000);

    const firstRequest = cache.hasValidSession(session, 1_000_000);
    const secondRequest = cache.hasValidSession(session, 1_000_001);

    expect(validate).toHaveBeenCalledOnce();

    rejectValidation?.(new Error('RPC unavailable'));

    await expect(firstRequest).resolves.toBe(false);
    await expect(secondRequest).resolves.toBe(false);
  });

  it('should retry after a concurrent validation failure', async () => {
    const validate = vi
      .fn()
      .mockRejectedValueOnce(new Error('RPC unavailable'))
      .mockResolvedValueOnce(true);
    const cache = createAccessGateSessionCache(validate);
    const session = buildSession(10_000_000);

    await Promise.all([
      cache.hasValidSession(session, 1_000_000),
      cache.hasValidSession(session, 1_000_001),
    ]);

    await expect(cache.hasValidSession(session, 1_000_002)).resolves.toBe(true);

    expect(validate).toHaveBeenCalledTimes(2);
  });

  it('should deduplicate concurrent validation requests for one session', async () => {
    let resolveValidation: ((value: boolean) => void) | undefined;
    const validation = new Promise<boolean>((resolve) => {
      resolveValidation = resolve;
    });
    const validate = vi.fn().mockReturnValue(validation);
    const cache = createAccessGateSessionCache(validate);
    const session = buildSession(10_000_000);

    const firstRequest = cache.hasValidSession(session, 1_000_000);
    const secondRequest = cache.hasValidSession(session, 1_000_001);

    expect(validate).toHaveBeenCalledOnce();

    resolveValidation?.(true);

    await expect(firstRequest).resolves.toBe(true);
    await expect(secondRequest).resolves.toBe(true);
  });

  it('should not reuse a cached session after clear', async () => {
    const validate = vi.fn().mockResolvedValue(true);
    const cache = createAccessGateSessionCache(validate);
    const session = buildSession(10_000_000);

    await cache.hasValidSession(session, 1_000_000);
    cache.clear();
    await cache.hasValidSession(session, 1_000_001);

    expect(validate).toHaveBeenCalledTimes(2);
  });

  it('should not repopulate the cache when clear runs during validation', async () => {
    let resolveValidation: ((value: boolean) => void) | undefined;
    const validation = new Promise<boolean>((resolve) => {
      resolveValidation = resolve;
    });
    const validate = vi.fn().mockReturnValue(validation);
    const cache = createAccessGateSessionCache(validate);
    const session = buildSession(10_000_000);

    const request = cache.hasValidSession(session, 1_000_000);
    cache.clear();
    resolveValidation?.(true);

    await expect(request).resolves.toBe(false);
    await expect(cache.hasValidSession(session, 1_000_001)).resolves.toBe(true);

    expect(validate).toHaveBeenCalledTimes(2);
  });

  it('should not let stale validation remove a newer cache entry', async () => {
    let resolveFirstValidation: ((value: boolean) => void) | undefined;
    const firstValidation = new Promise<boolean>((resolve) => {
      resolveFirstValidation = resolve;
    });
    const validate = vi
      .fn()
      .mockReturnValueOnce(firstValidation)
      .mockResolvedValueOnce(true);
    const cache = createAccessGateSessionCache(validate);
    const session = buildSession(10_000_000);

    const firstRequest = cache.hasValidSession(session, 1_000_000);
    cache.clear();
    await expect(cache.hasValidSession(session, 1_000_001)).resolves.toBe(true);

    resolveFirstValidation?.(true);
    await expect(firstRequest).resolves.toBe(false);
    await expect(cache.hasValidSession(session, 1_000_002)).resolves.toBe(true);

    expect(validate).toHaveBeenCalledTimes(2);
  });

  it('should not cache a session that is already expired', async () => {
    const validate = vi.fn().mockResolvedValue(true);
    const cache = createAccessGateSessionCache(validate);
    const session = buildSession(1_000_000);

    await expect(cache.hasValidSession(session, 1_000_001)).resolves.toBe(
      false,
    );
    await expect(cache.hasValidSession(session, 1_000_002)).resolves.toBe(
      false,
    );

    expect(validate).not.toHaveBeenCalled();
  });

  it('should reject non-finite and negative expiry values without calling the RPC', async () => {
    const validate = vi.fn().mockResolvedValue(true);
    const cache = createAccessGateSessionCache(validate);

    const nonFiniteSession = buildSession(10_000_000);
    nonFiniteSession.exp = Number.NaN;

    const infiniteSession = buildSession(10_000_000);
    infiniteSession.exp = Number.POSITIVE_INFINITY;

    const negativeSession = buildSession(10_000_000);
    negativeSession.exp = -1;

    await expect(
      cache.hasValidSession(nonFiniteSession, 1_000_000),
    ).resolves.toBe(false);
    await expect(
      cache.hasValidSession(infiniteSession, 1_000_000),
    ).resolves.toBe(false);
    await expect(
      cache.hasValidSession(negativeSession, 1_000_000),
    ).resolves.toBe(false);

    expect(validate).not.toHaveBeenCalled();
  });

  it('should reject empty or malformed identifiers without calling the RPC', async () => {
    const validate = vi.fn().mockResolvedValue(true);
    const cache = createAccessGateSessionCache(validate);

    const emptyInviteSession = buildSession(10_000_000, '', buildUuid(2));
    const malformedVisitSession = buildSession(
      10_000_000,
      buildUuid(1),
      'not-a-uuid',
    );

    await expect(
      cache.hasValidSession(emptyInviteSession, 1_000_000),
    ).resolves.toBe(false);
    await expect(
      cache.hasValidSession(malformedVisitSession, 1_000_000),
    ).resolves.toBe(false);

    expect(validate).not.toHaveBeenCalled();
  });

  it('should use the invite and visit pair as the cache key', async () => {
    const validate = vi.fn().mockResolvedValue(true);
    const cache = createAccessGateSessionCache(validate);
    const firstSession = buildSession(10_000_000);
    const secondSession = {
      ...firstSession,
      visitId: buildUuid(3),
    };

    await cache.hasValidSession(firstSession, 1_000_000);
    await cache.hasValidSession(secondSession, 1_000_001);

    expect(validate).toHaveBeenCalledTimes(2);
  });

  it('should treat different invite IDs as different cache keys', async () => {
    const validate = vi.fn().mockResolvedValue(true);
    const cache = createAccessGateSessionCache(validate);
    const firstSession = buildSession(10_000_000, buildUuid(1), buildUuid(2));
    const secondSession = buildSession(10_000_000, buildUuid(3), buildUuid(2));

    await cache.hasValidSession(firstSession, 1_000_000);
    await cache.hasValidSession(secondSession, 1_000_001);

    expect(validate).toHaveBeenCalledTimes(2);
  });

  it('should evict the oldest entry when the cache reaches its maximum size', async () => {
    const validate = vi.fn().mockResolvedValue(true);
    const cache = createAccessGateSessionCache(validate);

    for (let index = 0; index < MAX_CACHED_SESSIONS; index += 1) {
      await cache.hasValidSession(
        buildSession(10_000_000, buildUuid(index + 1), buildUuid(index + 1)),
        1_000_000,
      );
    }

    await cache.hasValidSession(
      buildSession(
        10_000_000,
        buildUuid(MAX_CACHED_SESSIONS + 1),
        buildUuid(1),
      ),
      1_000_001,
    );
    await cache.hasValidSession(
      buildSession(10_000_000, buildUuid(1), buildUuid(1)),
      1_000_002,
    );

    expect(validate).toHaveBeenCalledTimes(MAX_CACHED_SESSIONS + 2);
  });

  it('should preserve recently used entries during eviction', async () => {
    const validate = vi.fn().mockResolvedValue(true);
    const cache = createAccessGateSessionCache(validate);
    const firstSession = buildSession(10_000_000, buildUuid(1), buildUuid(1));

    await cache.hasValidSession(firstSession, 1_000_000);

    for (let index = 1; index < MAX_CACHED_SESSIONS; index += 1) {
      await cache.hasValidSession(
        buildSession(10_000_000, buildUuid(index + 1), buildUuid(index + 1)),
        1_000_000,
      );
    }

    await cache.hasValidSession(firstSession, 1_000_001);
    await cache.hasValidSession(
      buildSession(
        10_000_000,
        buildUuid(MAX_CACHED_SESSIONS + 1),
        buildUuid(1),
      ),
      1_000_002,
    );
    await cache.hasValidSession(firstSession, 1_000_003);

    expect(validate).toHaveBeenCalledTimes(MAX_CACHED_SESSIONS + 1);
  });
});
