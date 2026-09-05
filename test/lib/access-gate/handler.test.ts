import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAccessGateCookieValue } from '@/lib/access-gate/cookie';
import { handleAccessGateRequest } from '@/lib/access-gate/proxy';

const { hasValidSession } = vi.hoisted(() => ({
  hasValidSession: vi.fn(),
}));

vi.mock('@/lib/access-gate/session-cache', () => ({
  accessGateSessionCache: {
    hasValidSession,
  },
}));

const AZURE_CONTAINER_APP_NAME = 'aca-access-control-demo';

const AZURE_ENV_DNS_SUFFIX = 'example.australiaeast.azurecontainerapps.io';

const CUSTOM_DOMAIN = 'braddlesunravels.online';
const COOKIE_SECRET = 'test-access-gate-cookie-secret-that-is-long-enough';
const INVITE_ID = '11111111-1111-4111-8111-111111111111';
const VISIT_ID = '22222222-2222-4222-8222-222222222222';
const COOKIE_EXPIRY_MS = Date.parse('2026-12-22T00:00:00.000Z');

describe('lib/access-gate/proxy', () => {
  beforeEach(() => {
    hasValidSession.mockReset();
    vi.stubEnv('ACCESS_GATE_DISABLED', 'false');

    vi.stubEnv('ACCESS_GATE_COOKIE_SECRET', '');

    vi.stubEnv('NEXT_SUPABASE_URL', 'http://localhost:54321');

    vi.stubEnv('NEXT_SUPABASE_PUBLISHABLE_KEY', 'test-key');

    vi.stubEnv('CONTAINER_APP_NAME', '');

    vi.stubEnv('CONTAINER_APP_ENV_DNS_SUFFIX', '');

    vi.stubEnv('AZURE_CUSTOM_DOMAIN', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should redirect an unauthenticated local request to the access gate', async () => {
    const request = new NextRequest(
      'http://localhost:3000/protected?tab=upcoming',
    );

    const response = await handleAccessGateRequest(request);

    expect(response?.status).toBe(307);

    expect(response?.headers.get('location')).toBe(
      'http://localhost:3000/?next=%2Fprotected%3Ftab%3Dupcoming',
    );
  });

  it('should use the custom domain for access-gate redirects in Azure', async () => {
    vi.stubEnv('CONTAINER_APP_NAME', AZURE_CONTAINER_APP_NAME);

    vi.stubEnv('CONTAINER_APP_ENV_DNS_SUFFIX', AZURE_ENV_DNS_SUFFIX);

    vi.stubEnv('AZURE_CUSTOM_DOMAIN', CUSTOM_DOMAIN);

    const request = new NextRequest('http://0.0.0.0:3000/protected');

    const response = await handleAccessGateRequest(request);

    expect(response?.status).toBe(307);

    expect(response?.headers.get('location')).toBe(
      'https://braddlesunravels.online/?next=%2Fprotected',
    );
  });

  it('should not gate the email confirmation landing page', async () => {
    const request = new NextRequest('http://localhost:3000/auth/confirm-email');

    const response = await handleAccessGateRequest(request);

    expect(response?.status).toBe(200);

    expect(response?.headers.get('location')).toBeNull();
  });

  it('should not gate the email confirmation POST endpoint', async () => {
    const request = new NextRequest('http://localhost:3000/auth/confirm', {
      method: 'POST',
    });

    const response = await handleAccessGateRequest(request);

    expect(response?.status).toBe(200);

    expect(response?.headers.get('location')).toBeNull();
  });

  it('should consult the session cache before allowing a valid signed cookie', async () => {
    const cookieValue = createAccessGateCookieValue(
      { inviteId: INVITE_ID, visitId: VISIT_ID },
      COOKIE_SECRET,
      COOKIE_EXPIRY_MS,
    );
    vi.stubEnv('ACCESS_GATE_COOKIE_SECRET', COOKIE_SECRET);
    hasValidSession.mockResolvedValue(true);

    const request = new NextRequest('http://localhost:3000/protected', {
      headers: {
        cookie: `access_gate=${cookieValue}`,
      },
    });

    await expect(handleAccessGateRequest(request)).resolves.toBeUndefined();

    expect(hasValidSession).toHaveBeenCalledWith(
      expect.objectContaining({
        inviteId: INVITE_ID,
        visitId: VISIT_ID,
      }),
    );
  });

  it('should reject and clear a signed cookie when session validation fails', async () => {
    const cookieValue = createAccessGateCookieValue(
      { inviteId: INVITE_ID, visitId: VISIT_ID },
      COOKIE_SECRET,
      COOKIE_EXPIRY_MS,
    );
    vi.stubEnv('ACCESS_GATE_COOKIE_SECRET', COOKIE_SECRET);
    hasValidSession.mockResolvedValue(false);

    const request = new NextRequest('http://localhost:3000/protected', {
      headers: {
        cookie: `access_gate=${cookieValue}`,
      },
    });

    const response = await handleAccessGateRequest(request);

    expect(response?.status).toBe(307);
    expect(response?.headers.get('location')).toContain('/?next=%2Fprotected');
    expect(response?.cookies.get('access_gate')?.value).toBe('');
  });

  it('should not call the session cache for a malformed cookie', async () => {
    vi.stubEnv('ACCESS_GATE_COOKIE_SECRET', COOKIE_SECRET);

    const request = new NextRequest('http://localhost:3000/protected', {
      headers: {
        cookie: 'access_gate=malformed-cookie',
      },
    });

    const response = await handleAccessGateRequest(request);

    expect(response?.status).toBe(307);
    expect(hasValidSession).not.toHaveBeenCalled();
  });
});
