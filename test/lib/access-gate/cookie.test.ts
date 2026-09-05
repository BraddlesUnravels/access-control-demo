import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createAccessGateCookieValue,
  getAccessGateCookieOptions,
  verifyAccessGateCookieValue,
} from '@/lib/access-gate/cookie';

const SECRET = 'test-access-gate-cookie-secret-that-is-long-enough';
const NOW_MS = Date.parse('2026-08-08T00:00:00.000Z');
const EXPIRES_AT_MS = Date.parse('2026-08-22T00:00:00.000Z');
const INVITE_ID = '11111111-1111-4111-8111-111111111111';
const VISIT_ID = '22222222-2222-4222-8222-222222222222';

const createSignedRawPayload = (rawPayload: string): string => {
  const encodedPayload = Buffer.from(rawPayload, 'utf8').toString('base64url');
  const signature = createHmac('sha256', SECRET)
    .update(encodedPayload)
    .digest('base64url');

  return `${encodedPayload}.${signature}`;
};

describe('lib/access-gate/cookie', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should round-trip the minimal signed payload with the supplied absolute expiry', () => {
    const value = createAccessGateCookieValue(
      { inviteId: INVITE_ID, visitId: VISIT_ID },
      SECRET,
      EXPIRES_AT_MS,
    );

    expect(verifyAccessGateCookieValue(value, SECRET, NOW_MS)).toEqual({
      version: 2,
      inviteId: INVITE_ID,
      visitId: VISIT_ID,
      exp: Math.floor(EXPIRES_AT_MS / 1000),
    });
  });

  it('should reject a cookie signed with a different secret', () => {
    const value = createAccessGateCookieValue(
      { inviteId: INVITE_ID, visitId: VISIT_ID },
      SECRET,
      EXPIRES_AT_MS,
    );

    expect(
      verifyAccessGateCookieValue(
        value,
        'different-cookie-secret-that-is-also-long-enough',
        NOW_MS,
      ),
    ).toBeUndefined();
  });

  it('should reject a tampered signature', () => {
    const value = createAccessGateCookieValue(
      { inviteId: INVITE_ID, visitId: VISIT_ID },
      SECRET,
      EXPIRES_AT_MS,
    );
    const [payload, signature] = value.split('.');
    const replacement = signature?.startsWith('A') ? 'B' : 'A';
    const tamperedSignature = `${replacement}${signature?.slice(1) ?? ''}`;

    expect(
      verifyAccessGateCookieValue(
        `${payload}.${tamperedSignature}`,
        SECRET,
        NOW_MS,
      ),
    ).toBeUndefined();
  });

  it('should reject a different-length signature without throwing', () => {
    const value = createAccessGateCookieValue(
      { inviteId: INVITE_ID, visitId: VISIT_ID },
      SECRET,
      EXPIRES_AT_MS,
    );
    const [payload] = value.split('.');
    const malformedCookie = `${payload}.a`;

    expect(() =>
      verifyAccessGateCookieValue(malformedCookie, SECRET, NOW_MS),
    ).not.toThrow();

    expect(
      verifyAccessGateCookieValue(malformedCookie, SECRET, NOW_MS),
    ).toBeUndefined();
  });

  it('should reject malformed cookie structure', () => {
    expect(
      verifyAccessGateCookieValue('not-a-cookie', SECRET, NOW_MS),
    ).toBeUndefined();

    expect(
      verifyAccessGateCookieValue('one.two.three', SECRET, NOW_MS),
    ).toBeUndefined();
  });

  it('should reject signed invalid JSON without throwing', () => {
    const value = createSignedRawPayload('{invalid-json');

    expect(() =>
      verifyAccessGateCookieValue(value, SECRET, NOW_MS),
    ).not.toThrow();

    expect(verifyAccessGateCookieValue(value, SECRET, NOW_MS)).toBeUndefined();
  });

  it('should reject a signed payload with an invalid shape without throwing', () => {
    const value = createSignedRawPayload('null');

    expect(() =>
      verifyAccessGateCookieValue(value, SECRET, NOW_MS),
    ).not.toThrow();

    expect(verifyAccessGateCookieValue(value, SECRET, NOW_MS)).toBeUndefined();
  });

  it('should reject the cookie at its absolute expiry', () => {
    const value = createAccessGateCookieValue(
      { inviteId: INVITE_ID, visitId: VISIT_ID },
      SECRET,
      EXPIRES_AT_MS,
    );

    expect(
      verifyAccessGateCookieValue(value, SECRET, EXPIRES_AT_MS - 1),
    ).toBeDefined();

    expect(
      verifyAccessGateCookieValue(value, SECRET, EXPIRES_AT_MS),
    ).toBeUndefined();
  });

  it('should reject a non-finite expiry when creating a cookie', () => {
    expect(() =>
      createAccessGateCookieValue(
        { inviteId: INVITE_ID, visitId: VISIT_ID },
        SECRET,
        Number.NaN,
      ),
    ).toThrow('Access gate cookie expiry must be a valid timestamp.');
  });

  it('should reject non-UUID invite or visit identifiers when creating a cookie', () => {
    expect(() =>
      createAccessGateCookieValue(
        { inviteId: 'invite-1', visitId: VISIT_ID },
        SECRET,
        EXPIRES_AT_MS,
      ),
    ).toThrow('Access gate cookie payload must contain valid UUIDs.');
  });

  it('should create secure browser-cookie options with the same absolute expiry', () => {
    vi.stubEnv('CONTAINER_APP_NAME', 'aca-access-control-demo');
    vi.stubEnv(
      'CONTAINER_APP_ENV_DNS_SUFFIX',
      'example.australiaeast.azurecontainerapps.io',
    );

    const options = getAccessGateCookieOptions(EXPIRES_AT_MS);

    expect(options).toEqual({
      name: 'access_gate',
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      expires: new Date(EXPIRES_AT_MS),
    });
  });

  it('should create non-secure browser-cookie options outside Azure', () => {
    vi.stubEnv('CONTAINER_APP_NAME', '');
    vi.stubEnv('CONTAINER_APP_ENV_DNS_SUFFIX', '');

    const options = getAccessGateCookieOptions(EXPIRES_AT_MS);

    expect(options).toEqual({
      name: 'access_gate',
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
      expires: new Date(EXPIRES_AT_MS),
    });
  });
});
