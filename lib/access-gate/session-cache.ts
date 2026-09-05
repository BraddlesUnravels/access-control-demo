import 'server-only';

import type { AccessGateCookiePayload } from './cookie';
import { isAccessGateCookiePayload } from './cookie';
import { validateAccessGateSession } from './session-validation';
import { isUuid } from '@/lib/validation/helpers';

export const ACCESS_GATE_SESSION_REVALIDATION_INTERVAL_MS = 60 * 60 * 1000;

export const MAX_CACHED_SESSIONS = 1_000;

type SessionValidator = (inviteId: string, visitId: string) => Promise<boolean>;

type CachedSession = {
  checkedAtMs: number;
  expiresAtMs: number;
};

type AccessGateSessionCache = {
  hasValidSession: (
    payload: AccessGateCookiePayload,
    nowMs?: number,
  ) => Promise<boolean>;
  clear: () => void;
};

const getSessionKey = (payload: AccessGateCookiePayload): string =>
  `${payload.inviteId}:${payload.visitId}`;

const getCacheExpiryMs = (
  payload: AccessGateCookiePayload,
  checkedAtMs: number,
): number =>
  Math.min(
    payload.exp * 1000,
    checkedAtMs + ACCESS_GATE_SESSION_REVALIDATION_INTERVAL_MS,
  );

const isSessionExpired = (
  payload: AccessGateCookiePayload,
  nowMs: number,
): boolean => payload.exp * 1000 <= nowMs;

const isCacheableSessionPayload = (payload: AccessGateCookiePayload): boolean =>
  isAccessGateCookiePayload(payload) &&
  isUuid(payload.inviteId) &&
  isUuid(payload.visitId);

export const createAccessGateSessionCache = (
  validate: SessionValidator = validateAccessGateSession,
): AccessGateSessionCache => {
  const cachedSessions = new Map<string, CachedSession>();
  const inFlightValidations = new Map<string, Promise<boolean>>();
  let cacheGeneration = 0;

  const pruneExpiredSessions = (nowMs: number): void => {
    for (const [key, session] of cachedSessions) {
      if (session.expiresAtMs <= nowMs) cachedSessions.delete(key);
    }
  };

  const cacheSuccessfulValidation = (
    key: string,
    payload: AccessGateCookiePayload,
    checkedAtMs: number,
  ): void => {
    const cacheExpiresAtMs = getCacheExpiryMs(payload, checkedAtMs);

    if (cacheExpiresAtMs <= checkedAtMs) return;

    cachedSessions.delete(key);
    cachedSessions.set(key, { checkedAtMs, expiresAtMs: cacheExpiresAtMs });

    while (cachedSessions.size > MAX_CACHED_SESSIONS) {
      const oldestKey = cachedSessions.keys().next().value;

      if (oldestKey === undefined) return;

      cachedSessions.delete(oldestKey);
    }
  };

  const validateAndCache = (
    key: string,
    payload: AccessGateCookiePayload,
    checkedAtMs: number,
    generation: number,
  ): Promise<boolean> => {
    const validation = validate(payload.inviteId, payload.visitId)
      .then((isValid) => {
        if (generation !== cacheGeneration) return false;

        if (!isValid) {
          cachedSessions.delete(key);
          return false;
        }

        cacheSuccessfulValidation(key, payload, checkedAtMs);
        return true;
      })
      .catch(() => {
        if (generation === cacheGeneration) cachedSessions.delete(key);
        return false;
      });

    inFlightValidations.set(key, validation);

    void validation.finally(() => {
      if (inFlightValidations.get(key) === validation)
        inFlightValidations.delete(key);
    });

    return validation;
  };

  const hasValidSession = async (
    payload: AccessGateCookiePayload,
    nowMs = Date.now(),
  ): Promise<boolean> => {
    if (!isCacheableSessionPayload(payload)) return false;

    pruneExpiredSessions(nowMs);

    const key = getSessionKey(payload);

    if (isSessionExpired(payload, nowMs)) {
      cachedSessions.delete(key);
      return false;
    }

    const cached = cachedSessions.get(key);

    if (cached && cached.expiresAtMs > nowMs) {
      cachedSessions.delete(key);
      cachedSessions.set(key, cached);
      return true;
    }

    if (cached) cachedSessions.delete(key);

    const inFlightValidation = inFlightValidations.get(key);
    if (inFlightValidation) return inFlightValidation;

    return validateAndCache(key, payload, nowMs, cacheGeneration);
  };

  return {
    hasValidSession,
    clear: () => {
      cacheGeneration += 1;
      cachedSessions.clear();
      inFlightValidations.clear();
    },
  };
};

export const accessGateSessionCache = createAccessGateSessionCache();
