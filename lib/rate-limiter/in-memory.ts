import type {
  RateLimitResult,
  RateLimitEntry,
  InMemoryLimiterOptions,
} from './types';
import {
  MAX_REQUEST_LIMIT,
  MAX_CLIENTS_TRACKED,
  OVERFLOW_CLIENT_KEY,
  LIMIT_WINDOW_MS,
} from './types';

const toRetryAfterSeconds = (resetAtMs: number, nowMS: number): number =>
  Math.max(1, Math.ceil((resetAtMs - nowMS) / 1_000));

export const createInMemoryRateLimiter = (
  options: InMemoryLimiterOptions = {},
) => {
  // Client Map
  const entries = new Map<string, RateLimitEntry>();

  const maxRequests = options.maxRequests ?? MAX_REQUEST_LIMIT;
  const windowMs = options.windowMs ?? LIMIT_WINDOW_MS;
  const maxTrackedClients = options.maxTrackedClients ?? MAX_CLIENTS_TRACKED;

  let nextPruneAtMs = Number.POSITIVE_INFINITY;

  const trackNextExpiry = (resetAtMs: number) => {
    nextPruneAtMs = Math.min(nextPruneAtMs, resetAtMs);
  };

  const pruneExpiredEntries = (nowMs: number) => {
    if (nowMs < nextPruneAtMs) return;

    let nextExpiryMs = Number.POSITIVE_INFINITY;

    for (const [key, entry] of entries) {
      if (entry.resetAtMs <= nowMs) {
        entries.delete(key);
        continue;
      }

      nextExpiryMs = Math.min(nextExpiryMs, entry.resetAtMs);
    }

    nextPruneAtMs = nextExpiryMs;
  };

  const resolveClientKey = (clientId: string): string => {
    if (entries.has(clientId)) return clientId;

    return entries.size < maxTrackedClients ? clientId : OVERFLOW_CLIENT_KEY;
  };

  const consume = (
    clientId: string,
    nowMs: number = Date.now(),
  ): RateLimitResult => {
    pruneExpiredEntries(nowMs);

    const clientKey = resolveClientKey(clientId);
    const entry = entries.get(clientKey);

    if (!entry || entry.resetAtMs <= nowMs) {
      const resetAtMs = nowMs + windowMs;

      entries.set(clientKey, { requestCount: 1, resetAtMs });

      trackNextExpiry(resetAtMs);

      return {
        allowed: true,
        remaining: Math.max(0, maxRequests - 1),
        retryAfterSeconds: toRetryAfterSeconds(resetAtMs, nowMs),
      };
    }

    const requestCount = Math.min(entry.requestCount + 1, maxRequests + 1);

    entry.requestCount = requestCount;

    return {
      allowed: requestCount <= maxRequests,
      remaining: Math.max(0, maxRequests - requestCount),
      retryAfterSeconds: toRetryAfterSeconds(entry.resetAtMs, nowMs),
    };
  };

  return { consume };
};

const rateLimiter = createInMemoryRateLimiter();

export const consumeRateLimit = (clientId: string): RateLimitResult => {
  return rateLimiter.consume(clientId);
};
