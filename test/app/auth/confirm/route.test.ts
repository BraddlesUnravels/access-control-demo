import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from '@/app/auth/confirm/route';
import { serverResponseClient } from '@/lib/supabase/server';

vi.mock('@/lib/supabase/server', () => ({
  serverResponseClient: vi.fn(),
}));

const AZURE_CONTAINER_APP_NAME = 'aca-access-control-demo';

const AZURE_ENV_DNS_SUFFIX = 'example.australiaeast.azurecontainerapps.io';

const CUSTOM_DOMAIN = 'braddlesunravels.online';

type AuthClientMocks = {
  applyServerCookies: ReturnType<typeof vi.fn>;

  exchangeCodeForSession: ReturnType<typeof vi.fn>;

  verifyOtp: ReturnType<typeof vi.fn>;
};

const buildGetRequest = (
  search = '',
  origin = 'http://localhost',
): NextRequest => {
  return new NextRequest(`${origin}/auth/confirm${search}`);
};

const buildPostRequest = (
  values: Record<string, string>,
  origin = 'http://localhost',
): NextRequest => {
  return new NextRequest(`${origin}/auth/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(values),
  });
};

const setupServerResponseClientMock = (): AuthClientMocks => {
  const exchangeCodeForSession = vi.fn().mockResolvedValue({
    error: null,
  });

  const verifyOtp = vi.fn().mockResolvedValue({
    error: null,
  });

  const applyServerCookies = vi.fn();

  vi.mocked(serverResponseClient).mockResolvedValue({
    supabase: {
      auth: {
        exchangeCodeForSession,
        verifyOtp,
      },
    },
    applyServerCookies,
  } as never);

  return {
    applyServerCookies,
    exchangeCodeForSession,
    verifyOtp,
  };
};

describe('app/auth/confirm/route', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    /*
     * Default all tests to a non-Azure environment.
     * Individual Azure tests override these values.
     */
    vi.stubEnv('CONTAINER_APP_NAME', '');

    vi.stubEnv('CONTAINER_APP_ENV_DNS_SUFFIX', '');

    vi.stubEnv('AZURE_CUSTOM_DOMAIN', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should exchange a PKCE code and redirects to the requested internal path', async () => {
    const { applyServerCookies, exchangeCodeForSession } =
      setupServerResponseClientMock();

    const request = buildGetRequest('?code=valid-code&next=/admin');

    const response = await GET(request);

    expect(exchangeCodeForSession).toHaveBeenCalledWith('valid-code');

    expect(applyServerCookies).toHaveBeenCalledOnce();

    expect(response.status).toBe(307);

    expect(response.headers.get('location')).toBe('http://localhost/admin');
  });

  it('should use the Azure custom domain instead of the internal container origin', async () => {
    vi.stubEnv('CONTAINER_APP_NAME', AZURE_CONTAINER_APP_NAME);

    vi.stubEnv('CONTAINER_APP_ENV_DNS_SUFFIX', AZURE_ENV_DNS_SUFFIX);

    vi.stubEnv('AZURE_CUSTOM_DOMAIN', CUSTOM_DOMAIN);

    setupServerResponseClientMock();

    const request = buildGetRequest(
      '?code=valid-code&next=/protected',
      'http://0.0.0.0:3000',
    );

    const response = await GET(request);

    expect(response.headers.get('location')).toBe(
      'https://braddlesunravels.online/protected',
    );
  });

  it('should fall back to the Azure-generated FQDN when the custom domain is missing', async () => {
    vi.stubEnv('CONTAINER_APP_NAME', AZURE_CONTAINER_APP_NAME);

    vi.stubEnv('CONTAINER_APP_ENV_DNS_SUFFIX', AZURE_ENV_DNS_SUFFIX);

    vi.stubEnv('AZURE_CUSTOM_DOMAIN', '');

    setupServerResponseClientMock();

    const request = buildGetRequest(
      '?code=valid-code&next=/protected',
      'http://0.0.0.0:3000',
    );

    const response = await GET(request);

    expect(response.headers.get('location')).toBe(
      'https://aca-access-control-demo.example.australiaeast.azurecontainerapps.io/protected',
    );
  });

  it('should reject an external next destination', async () => {
    setupServerResponseClientMock();

    const request = buildGetRequest(
      '?code=valid-code&next=https://evil.example/path',
    );

    const response = await GET(request);

    expect(response.headers.get('location')).toBe('http://localhost/protected');
  });

  it('should reject a protocol-relative next destination', async () => {
    setupServerResponseClientMock();

    const request = buildGetRequest('?code=valid-code&next=//evil.example');

    const response = await GET(request);

    expect(response.headers.get('location')).toBe('http://localhost/protected');
  });

  it('should establish a recovery session before redirecting to the password update page', async () => {
    const { applyServerCookies, verifyOtp } = setupServerResponseClientMock();

    const request = buildGetRequest(
      '?token_hash=hash123&type=recovery&next=/auth/update-password',
    );

    const response = await GET(request);

    expect(verifyOtp).toHaveBeenCalledWith({
      token_hash: 'hash123',
      type: 'recovery',
    });

    expect(applyServerCookies).toHaveBeenCalledOnce();

    expect(response.status).toBe(307);

    expect(response.headers.get('location')).toBe(
      'http://localhost/auth/update-password',
    );
  });

  it('should not consume signup email token hashes through GET', async () => {
    const request = buildGetRequest('?token_hash=hash123&type=email');

    const response = await GET(request);

    expect(serverResponseClient).not.toHaveBeenCalled();

    expect(response.status).toBe(307);

    expect(response.headers.get('location')).toBe(
      'http://localhost/auth/login',
    );
  });

  it('should redirect to login when PKCE code exchange fails', async () => {
    const { applyServerCookies, exchangeCodeForSession } =
      setupServerResponseClientMock();

    exchangeCodeForSession.mockResolvedValue({
      error: {
        message: 'invalid code',
      },
    });

    const request = buildGetRequest('?code=invalid-code&next=/protected');

    const response = await GET(request);

    expect(applyServerCookies).not.toHaveBeenCalled();

    expect(response.status).toBe(307);

    expect(response.headers.get('location')).toBe(
      'http://localhost/auth/login',
    );
  });

  it('should verify an email token through POST', async () => {
    const { applyServerCookies, verifyOtp } = setupServerResponseClientMock();

    const request = buildPostRequest({
      token_hash: 'hash123',
      type: 'email',
      next: '/protected',
      website: '',
    });

    const response = await POST(request);

    expect(verifyOtp).toHaveBeenCalledWith({
      token_hash: 'hash123',
      type: 'email',
    });

    expect(applyServerCookies).toHaveBeenCalledOnce();

    expect(response.status).toBe(303);

    expect(response.headers.get('location')).toBe('http://localhost/protected');
  });

  it('should redirect successful email confirmation to the custom domain in Azure', async () => {
    vi.stubEnv('CONTAINER_APP_NAME', AZURE_CONTAINER_APP_NAME);

    vi.stubEnv('CONTAINER_APP_ENV_DNS_SUFFIX', AZURE_ENV_DNS_SUFFIX);

    vi.stubEnv('AZURE_CUSTOM_DOMAIN', CUSTOM_DOMAIN);

    const { applyServerCookies, verifyOtp } = setupServerResponseClientMock();

    const request = buildPostRequest(
      {
        token_hash: 'hash123',
        type: 'email',
        next: '/protected',
        website: '',
      },
      'http://0.0.0.0:3000',
    );

    const response = await POST(request);

    expect(verifyOtp).toHaveBeenCalledWith({
      token_hash: 'hash123',
      type: 'email',
    });

    expect(applyServerCookies).toHaveBeenCalledOnce();

    expect(response.status).toBe(303);

    expect(response.headers.get('location')).toBe(
      'https://braddlesunravels.online/protected',
    );
  });

  it('should reject a populated honeypot without consuming the token', async () => {
    const request = buildPostRequest({
      token_hash: 'hash123',
      type: 'email',
      next: '/protected',
      website: 'https://spam.example',
    });

    const response = await POST(request);

    expect(serverResponseClient).not.toHaveBeenCalled();
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(
      'http://localhost/auth/login',
    );
  });

  it('should reject unsupported confirmation types', async () => {
    const request = buildPostRequest({
      token_hash: 'hash123',
      type: 'recovery',
      website: '',
    });

    const response = await POST(request);

    expect(serverResponseClient).not.toHaveBeenCalled();

    expect(response.status).toBe(303);

    expect(response.headers.get('location')).toBe(
      'http://localhost/auth/login',
    );
  });

  it('should redirect to login when email token verification fails', async () => {
    const { applyServerCookies, verifyOtp } = setupServerResponseClientMock();

    verifyOtp.mockResolvedValue({
      error: {
        message: 'invalid token',
      },
    });

    const request = buildPostRequest({
      token_hash: 'invalid-hash',
      type: 'email',
      next: '/protected',
      website: '',
    });

    const response = await POST(request);

    expect(applyServerCookies).not.toHaveBeenCalled();

    expect(response.status).toBe(303);

    expect(response.headers.get('location')).toBe(
      'http://localhost/auth/login',
    );
  });

  it('should redirect to login when GET confirmation parameters are missing', async () => {
    const request = buildGetRequest();

    const response = await GET(request);

    expect(serverResponseClient).not.toHaveBeenCalled();

    expect(response.status).toBe(307);

    expect(response.headers.get('location')).toBe(
      'http://localhost/auth/login',
    );
  });

  it('should reject malformed form bodies without returning 500', async () => {
    const request = new NextRequest('http://localhost/auth/confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: '{invalid-json',
    });

    const response = await POST(request);

    expect(serverResponseClient).not.toHaveBeenCalled();
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(
      'http://localhost/auth/login',
    );
  });
});
