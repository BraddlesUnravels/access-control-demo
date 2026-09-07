import 'server-only';

import { cookies } from 'next/headers';
import { AppError } from '@/lib/errors';
import { ACCESS_GATE_COOKIE_NAME } from './constants';
import { getAccessGateCookiePayload } from './cookie';
import { isAccessGateDisabled, tryGetAccessGateCookieSecret } from './env';
import { accessGateSessionCache } from './session-cache';

const ACCESS_GATE_SAFE_MESSAGE = 'Access invite is required.';

/**
 * Independently verifies the visitor access-gate session for a Route
 * Handler, in addition to the access-gate check already performed by the
 * root proxy. Route handlers must not rely solely on middleware to enforce
 * the outer access-gate boundary.
 *
 * Returns false when the session is missing, malformed, expired, or rejected
 * by the database-backed session validator. Cached sessions return quickly;
 * cache misses perform a fresh validation so separate proxy and Route Handler
 * runtimes cannot cause valid requests to fail because their caches differ.
 */
export const hasValidAccessGateSession = async (): Promise<boolean> => {
  if (isAccessGateDisabled()) return true;

  const secret = tryGetAccessGateCookieSecret();

  if (!secret) return false;

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(ACCESS_GATE_COOKIE_NAME)?.value;

  const payload = getAccessGateCookiePayload(cookieValue, secret);

  if (!payload) return false;

  return accessGateSessionCache.hasValidSession(payload);
};

/**
 * Same check as hasValidAccessGateSession(), for Route Handlers that return
 * a JSON error response rather than a redirect on failure.
 *
 * Throws an AppError with a 401 status when the session is invalid.
 */
export const requireAccessGateSession = async (): Promise<void> => {
  if (await hasValidAccessGateSession()) return;

  throw new AppError('Access gate session is missing or invalid', {
    status: 401,
    safeMessage: ACCESS_GATE_SAFE_MESSAGE,
  });
};
