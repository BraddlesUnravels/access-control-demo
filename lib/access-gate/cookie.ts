import { createHmac, timingSafeEqual } from 'node:crypto';
import { ACCESS_GATE_COOKIE_NAME } from './constants';
import { isAzureEnv } from '../utils';
import { isUuid } from '../validation/helpers';

const ACCESS_GATE_COOKIE_VERSION = 2;

export type AccessGateCookiePayload = {
  version: typeof ACCESS_GATE_COOKIE_VERSION;
  inviteId: string;
  visitId: string;
  exp: number;
};

type AccessGateCookieInput = Pick<
  AccessGateCookiePayload,
  'inviteId' | 'visitId'
>;

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

export const isAccessGateCookiePayload = (
  value: unknown,
): value is AccessGateCookiePayload => {
  if (typeof value !== 'object' || value === null) return false;

  const payload = value as Partial<AccessGateCookiePayload>;

  return (
    payload.version === ACCESS_GATE_COOKIE_VERSION &&
    typeof payload.inviteId === 'string' &&
    payload.inviteId.length > 0 &&
    typeof payload.visitId === 'string' &&
    payload.visitId.length > 0 &&
    typeof payload.exp === 'number' &&
    Number.isSafeInteger(payload.exp)
  );
};

export const createAccessGateCookieValue = (
  payload: AccessGateCookieInput,
  secret: string,
  expiresAtMs: number,
): string => {
  if (!Number.isFinite(expiresAtMs))
    throw new Error('Access gate cookie expiry must be a valid timestamp.');

  if (!isUuid(payload.inviteId) || !isUuid(payload.visitId))
    throw new Error('Access gate cookie payload must contain valid UUIDs.');

  const fullPayload: AccessGateCookiePayload = {
    version: ACCESS_GATE_COOKIE_VERSION,
    inviteId: payload.inviteId,
    visitId: payload.visitId,
    exp: Math.floor(expiresAtMs / 1000),
  };
  const encodedPayload = toBase64Url(JSON.stringify(fullPayload));
  const signature = signPayload(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
};

export const verifyAccessGateCookieValue = (
  cookieValue: string = '',
  secret: string,
  nowMs: number = Date.now(),
): AccessGateCookiePayload | undefined => {
  const parts = cookieValue.split('.');

  if (parts.length !== 2) return;

  const [encodedPayload, signature] = parts;

  if (!encodedPayload || !signature) return;

  const expectedSignature = signPayload(encodedPayload, secret);

  if (!signaturesMatch(signature, expectedSignature)) return;

  let parsed: unknown;

  try {
    parsed = JSON.parse(fromBase64Url(encodedPayload));
  } catch {
    return;
  }

  if (!isAccessGateCookiePayload(parsed)) return;

  if (parsed.exp * 1000 <= nowMs) return;

  return parsed;
};

export const getAccessGateCookieOptions = (expiresAtMs: number) => ({
  name: ACCESS_GATE_COOKIE_NAME,
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: isAzureEnv(),
  path: '/',
  expires: new Date(expiresAtMs),
});
