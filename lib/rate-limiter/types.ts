export const MAX_REQUEST_LIMIT = 5;
export const LIMIT_WINDOW_MS = 60_000;

export const MAX_CLIENTS_TRACKED = 1_000;
export const OVERFLOW_CLIENT_KEY = '__limit_overflow__';

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export type RateLimitEntry = {
  requestCount: number;
  resetAtMs: number;
};

export type InMemoryLimiterOptions = {
  maxRequests?: number;
  windowMs?: number;
  maxTrackedClients?: number;
};
