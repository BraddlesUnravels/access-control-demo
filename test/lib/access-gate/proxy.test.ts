import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ACCESS_GATE_COOKIE_NAME } from '@/lib/access-gate/constants';
import { createAccessGateCookieValue } from '@/lib/access-gate/cookie';
import { handleAccessGateRequest } from '@/lib/access-gate/proxy';

const COOKIE_SECRET = 'test-access-gate-cookie-secret-that-is-long-enough';

const FUTURE_EXPIRY_MS = Date.parse('2099-08-22T00:00:00.000Z');

const createValidCookie = (): string => {
  return createAccessGateCookieValue(
    {
      inviteId: 'invite-1',
    },
    COOKIE_SECRET,
    FUTURE_EXPIRY_MS,
  );
};

const requestWithCookie = (url: string, cookieValue: string): NextRequest => {
  return new NextRequest(url, {
    headers: {
      cookie: `${ACCESS_GATE_COOKIE_NAME}=${cookieValue}`,
    },
  });
};

describe('lib/access-gate/proxy', () => {
  beforeEach(() => {
    vi.stubEnv('ACCESS_GATE_DISABLED', 'false');
    vi.stubEnv('ACCESS_GATE_COOKIE_SECRET', COOKIE_SECRET);
    vi.stubEnv('CONTAINER_APP_NAME', '');
    vi.stubEnv('CONTAINER_APP_ENV_DNS_SUFFIX', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should allow the root gate page without a cookie', () => {
    const response = handleAccessGateRequest(
      new NextRequest('http://localhost/'),
    );

    expect(response?.status).toBe(200);
    expect(response?.headers.get('location')).toBeNull();
  });

  it('should redirect a valid gated visitor away from the root to the requested destination', () => {
    const request = requestWithCookie(
      'http://localhost/?next=%2Fprotected%3Ftab%3Dconsultations',
      createValidCookie(),
    );

    const response = handleAccessGateRequest(request);

    expect(response?.status).toBe(307);
    expect(response?.headers.get('location')).toBe(
      'http://localhost/protected?tab=consultations',
    );
  });

  it('should redirect a valid gated visitor at the root to login when next is absent', () => {
    const request = requestWithCookie('http://localhost/', createValidCookie());

    const response = handleAccessGateRequest(request);

    expect(response?.status).toBe(307);
    expect(response?.headers.get('location')).toBe(
      'http://localhost/auth/login',
    );
  });

  it('should preserve the requested path and query when redirecting a blocked page request', () => {
    const response = handleAccessGateRequest(
      new NextRequest('http://localhost/protected?tab=consultations'),
    );

    expect(response?.status).toBe(307);
    expect(response?.headers.get('location')).toBe(
      'http://localhost/?next=%2Fprotected%3Ftab%3Dconsultations',
    );
  });

  it('should return 401 JSON with no-store for a blocked API request', async () => {
    const response = handleAccessGateRequest(
      new NextRequest('http://localhost/api/consultations'),
    );

    expect(response?.status).toBe(401);
    expect(response?.headers.get('cache-control')).toBe('no-store');

    await expect(response?.json()).resolves.toEqual({
      error: 'Access invite is required.',
    });
  });

  it('should allow public access-gate and health routes without a cookie', () => {
    const unlockResponse = handleAccessGateRequest(
      new NextRequest('http://localhost/api/access/unlock'),
    );

    const healthResponse = handleAccessGateRequest(
      new NextRequest('http://localhost/api/health'),
    );

    expect(unlockResponse?.status).toBe(200);
    expect(healthResponse?.status).toBe(200);
  });

  it('should hand a protected request with a valid cookie to the Supabase layer', () => {
    const request = requestWithCookie(
      'http://localhost/protected',
      createValidCookie(),
    );

    expect(handleAccessGateRequest(request)).toBeUndefined();
  });

  it('should clear an expired cookie and return the root gate', () => {
    const expiredCookie = createAccessGateCookieValue(
      {
        inviteId: 'invite-1',
      },
      COOKIE_SECRET,
      Date.parse('2020-01-01T00:00:00.000Z'),
    );

    const request = requestWithCookie('http://localhost/', expiredCookie);

    const response = handleAccessGateRequest(request);

    expect(response?.status).toBe(200);
    expect(response?.cookies.get(ACCESS_GATE_COOKIE_NAME)?.value).toBe('');
  });

  it('should fail closed and clear an existing cookie when the signing secret is unavailable', () => {
    vi.stubEnv('ACCESS_GATE_COOKIE_SECRET', '');

    const request = requestWithCookie(
      'http://localhost/protected',
      createValidCookie(),
    );

    const response = handleAccessGateRequest(request);

    expect(response?.status).toBe(307);

    expect(response?.headers.get('location')).toBe(
      'http://localhost/?next=%2Fprotected',
    );

    expect(response?.cookies.get(ACCESS_GATE_COOKIE_NAME)?.value).toBe('');
  });

  it('should bypass the gate locally when explicitly disabled', () => {
    vi.stubEnv('ACCESS_GATE_DISABLED', 'true');

    expect(
      handleAccessGateRequest(new NextRequest('http://localhost/protected')),
    ).toBeUndefined();
  });

  it('should not allow ACCESS_GATE_DISABLED to bypass the gate in Azure', () => {
    vi.stubEnv('ACCESS_GATE_DISABLED', 'true');
    vi.stubEnv('CONTAINER_APP_NAME', 'aca-access-control-demo');
    vi.stubEnv(
      'CONTAINER_APP_ENV_DNS_SUFFIX',
      'example.australiaeast.azurecontainerapps.io',
    );

    const response = handleAccessGateRequest(
      new NextRequest('https://example.com/protected'),
    );

    expect(response?.status).toBe(307);

    expect(response?.headers.get('location')).toBe(
      'https://example.com/?next=%2Fprotected',
    );
  });
});
