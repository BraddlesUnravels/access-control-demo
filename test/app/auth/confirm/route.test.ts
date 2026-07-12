import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/auth/confirm/route';
import { serverResponseClient } from '@/lib/supabase/server';

vi.mock('@/lib/supabase/server', () => ({
  serverResponseClient: vi.fn(),
}));

type AuthClientMocks = {
  applyServerCookies: ReturnType<typeof vi.fn>;
  exchangeCodeForSession: ReturnType<typeof vi.fn>;
  verifyOtp: ReturnType<typeof vi.fn>;
};

const buildRequest = (search = '') => {
  return new NextRequest(`http://localhost/auth/confirm${search}`);
};

const setupServerResponseClientMock = (): AuthClientMocks => {
  const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
  const verifyOtp = vi.fn().mockResolvedValue({ error: null });
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
  });

  it('should exchange code and redirect to next path on success', async () => {
    const { applyServerCookies, exchangeCodeForSession } = setupServerResponseClientMock();
    const request = buildRequest('?code=valid-code&next=/admin');

    const response = await GET(request);

    expect(exchangeCodeForSession).toHaveBeenCalledWith('valid-code');
    expect(applyServerCookies).toHaveBeenCalledOnce();
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/admin');
  });

  it('should redirect to login when code exchange fails', async () => {
    const { applyServerCookies, exchangeCodeForSession } = setupServerResponseClientMock();
    exchangeCodeForSession.mockResolvedValue({ error: { message: 'invalid code' } });

    const request = buildRequest('?code=invalid-code&next=/protected');
    const response = await GET(request);

    expect(applyServerCookies).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/auth/login');
  });

  it('should verify otp and redirect to protected on success', async () => {
    const { applyServerCookies, verifyOtp } = setupServerResponseClientMock();
    const request = buildRequest('?token_hash=hash123&type=recovery');

    const response = await GET(request);

    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'hash123', type: 'recovery' });
    expect(applyServerCookies).toHaveBeenCalledOnce();
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/protected');
  });

  it('should redirect to login when query params are missing', async () => {
    const { applyServerCookies, exchangeCodeForSession, verifyOtp } = setupServerResponseClientMock();
    const request = buildRequest();

    const response = await GET(request);

    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(applyServerCookies).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/auth/login');
  });
});
