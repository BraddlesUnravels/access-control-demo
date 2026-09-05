import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleAccessGateRequest } from '@/lib/access-gate/proxy';
import { updateSession } from '@/lib/supabase/proxy';
import { config, proxy } from '@/proxy';

vi.mock('@/lib/access-gate/proxy', () => ({
  handleAccessGateRequest: vi.fn(),
}));

vi.mock('@/lib/supabase/proxy', () => ({
  updateSession: vi.fn(),
}));

describe('root proxy orchestration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should short-circuit Supabase session handling when the access gate returns a response', async () => {
    const request = new NextRequest('http://localhost/protected');

    const accessGateResponse = NextResponse.json(
      {
        error: 'Access invite is required.',
      },
      {
        status: 401,
      },
    );

    vi.mocked(handleAccessGateRequest).mockResolvedValue(accessGateResponse);

    const response = await proxy(request);

    expect(handleAccessGateRequest).toHaveBeenCalledOnce();
    expect(handleAccessGateRequest).toHaveBeenCalledWith(request);

    expect(updateSession).not.toHaveBeenCalled();

    expect(response).toBe(accessGateResponse);
  });

  it('should delegate to Supabase session handling when the access gate allows the request', async () => {
    const request = new NextRequest('http://localhost/protected');
    const supabaseResponse = NextResponse.next();

    vi.mocked(handleAccessGateRequest).mockResolvedValue(undefined);
    vi.mocked(updateSession).mockResolvedValue(supabaseResponse);

    const response = await proxy(request);

    expect(handleAccessGateRequest).toHaveBeenCalledOnce();
    expect(handleAccessGateRequest).toHaveBeenCalledWith(request);

    expect(updateSession).toHaveBeenCalledOnce();
    expect(updateSession).toHaveBeenCalledWith(request);

    expect(response).toBe(supabaseResponse);
  });
});

describe('root proxy matcher', () => {
  it.each([
    '/',
    '/auth/login',
    '/auth/sign-up',
    '/protected',
    '/protected/consultations',
    '/api/access/unlock',
    '/api/consultations',
    '/api/admin/consultations',
  ])('should run the proxy for %s', (url) => {
    expect(
      unstable_doesMiddlewareMatch({
        config,
        url,
      }),
    ).toBe(true);
  });

  it.each(['/api/healthcheck', '/api/healthy', '/api/health-status'])(
    'should run the proxy for similarly named non-health route %s',
    (url) => {
      expect(
        unstable_doesMiddlewareMatch({
          config,
          url,
        }),
      ).toBe(true);
    },
  );

  it.each([
    '/api/health',
    '/api/health/',
    '/api/health/live',
    '/api/health/readiness',
  ])('should exclude the health route boundary %s', (url) => {
    expect(
      unstable_doesMiddlewareMatch({
        config,
        url,
      }),
    ).toBe(false);
  });

  it.each([
    '/_next/static/chunks/app.js',
    '/_next/static/css/app.css',
    '/_next/image?url=%2Flogo.png&w=64&q=75',
    '/favicon.ico',
    '/logo.svg',
    '/images/logo.png',
    '/images/photo.jpg',
    '/images/photo.jpeg',
    '/images/loading.gif',
    '/images/banner.webp',
  ])('should exclude framework and static asset path %s', (url) => {
    expect(
      unstable_doesMiddlewareMatch({
        config,
        url,
      }),
    ).toBe(false);
  });
});
