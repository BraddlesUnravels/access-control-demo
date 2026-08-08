import { createHmac, timingSafeEqual } from 'node:crypto';
import { ACCESS_GATE_COOKIE_NAME } from '@/lib/access-gate/constants';

const ACCESS_GATE_COOKIE_VERSION = 1;

export type AccessGateCookiePayload = {
  version: typeof ACCESS_GATE_COOKIE_VERSION;
  inviteId: string;
  exp: number;
};

type AccessGateCookieInput = Pick<AccessGateCookiePayload, 'inviteId'>;

const toBase64Url = (value: string): string => {
  return Buffer.from(value, 'utf8').toString('base64url');
};

const fromBase64Url = (value: string): string => {
  return Buffer.from(value, 'base64url').toString('utf8');
};

const signPayload = (encodedPayload: string, secret: string): string => {
  return createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');
};

const signaturesMatch = (left: string, right: string): boolean => {
  let leftBuffer: Buffer;
  let rightBuffer: Buffer;

  // If either value is not valid base64url, return false
  try {
    leftBuffer = Buffer.from(left, 'base64url');
    rightBuffer = Buffer.from(right, 'base64url');
  } catch {
    return false;
  }
  if (leftBuffer.length !== rightBuffer.length) return false;

  return timingSafeEqual(leftBuffer, rightBuffer);
};

const isAccessGateCookiePayload = (
  value: unknown,
): value is AccessGateCookiePayload => {
  if (typeof value !== 'object' || value === null) return false;

  const payload = value as Partial<AccessGateCookiePayload>;

  return (
    payload.version === ACCESS_GATE_COOKIE_VERSION &&
    typeof payload.inviteId === 'string' &&
    payload.inviteId.length > 0 &&
    typeof payload.exp === 'number' &&
    Number.isSafeInteger(payload.exp)
  );
};

export const createAccessGateCookieValue = (
  payload: AccessGateCookieInput,
  secret: string,
  expiresAtMs: number,
): string => {
  if (!Number.isFinite(expiresAtMs)) {
    throw new Error('Access gate cookie expiry must be a valid timestamp.');
  }

  const fullPayload: AccessGateCookiePayload = {
    version: ACCESS_GATE_COOKIE_VERSION,
    inviteId: payload.inviteId,
    exp: Math.floor(expiresAtMs / 1000),
  };
  const encodedPayload = toBase64Url(JSON.stringify(fullPayload));
  const signature = signPayload(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
};

export const verifyAccessGateCookieValue = (
  cookieValue: string,
  secret: string,
  nowMs: number = Date.now(),
): AccessGateCookiePayload | undefined => {
  const parts = cookieValue.split('.');

  if (parts.length !== 2) return undefined;

  const [encodedPayload, signature] = parts;

  if (!encodedPayload || !signature) return undefined;

  const expectedSignature = signPayload(encodedPayload, secret);

  if (!signaturesMatch(signature, expectedSignature)) return undefined;

  let parsed: unknown;

  try {
    parsed = JSON.parse(fromBase64Url(encodedPayload));
  } catch {
    return undefined;
  }

  if (!isAccessGateCookiePayload(parsed)) return undefined;

  if (parsed.exp * 1000 <= nowMs) return undefined;

  return parsed;
};

export const getAccessGateCookieOptions = (
  isSecure: boolean,
  expiresAtMs: number,
) => {
  return {
    name: ACCESS_GATE_COOKIE_NAME,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isSecure,
    path: '/',
    expires: new Date(expiresAtMs),
  };
};
