import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  ACCESS_GATE_COOKIE_MAX_AGE_SECONDS,
  ACCESS_GATE_COOKIE_NAME,
} from '@/lib/access-gate/constants';

export type AccessGateCookiePayload = {
  visitId: string;
  inviteId: string;
  label: string;
  exp: number;
};

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
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
};

export const createAccessGateCookieValue = (
  payload: Omit<AccessGateCookiePayload, 'exp'>,
  secret: string,
  nowMs: number = Date.now(),
): string => {
  const fullPayload: AccessGateCookiePayload = {
    ...payload,
    exp: Math.floor(nowMs / 1000) + ACCESS_GATE_COOKIE_MAX_AGE_SECONDS,
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
  const separatorIndex = cookieValue.lastIndexOf('.');

  if (separatorIndex <= 0 || separatorIndex === cookieValue.length - 1) {
    return undefined;
  }

  const encodedPayload = cookieValue.slice(0, separatorIndex);
  const signature = cookieValue.slice(separatorIndex + 1);
  const expectedSignature = signPayload(encodedPayload, secret);

  if (!signaturesMatch(signature, expectedSignature)) {
    return undefined;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(fromBase64Url(encodedPayload));
  } catch {
    return undefined;
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as AccessGateCookiePayload).visitId !== 'string' ||
    typeof (parsed as AccessGateCookiePayload).inviteId !== 'string' ||
    typeof (parsed as AccessGateCookiePayload).label !== 'string' ||
    typeof (parsed as AccessGateCookiePayload).exp !== 'number'
  ) {
    return undefined;
  }

  const payload = parsed as AccessGateCookiePayload;

  if (payload.exp * 1000 <= nowMs) {
    return undefined;
  }

  return payload;
};

export const getAccessGateCookieOptions = (isSecure: boolean) => {
  return {
    name: ACCESS_GATE_COOKIE_NAME,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isSecure,
    path: '/',
    maxAge: ACCESS_GATE_COOKIE_MAX_AGE_SECONDS,
  };
};
