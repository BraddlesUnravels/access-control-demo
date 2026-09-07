import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleAccessGateRequest } from '@/lib/access-gate/proxy';
import { logger } from '@/lib/logger';
import { updateSession } from '@/lib/supabase/proxy';
import { config, proxy } from '@/proxy';

vi.mock('@/lib/access-gate/proxy', () => ({
  handleAccessGateRequest: vi.fn(),
}));

vi.mock('@/lib/supabase/proxy', () => ({
  updateSession: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
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

  it('should fail closed and log when access-gate handling throws', async () => {
    const request = new NextRequest(
      'http://localhost/protected?token=secret-value',
    );
    const error = new Error('Access gate unavailable');

    vi.mocked(handleAccessGateRequest).mockRejectedValue(error);

    const response = await proxy(request);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Internal server error',
    });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(logger.error).toHaveBeenCalledWith(
      {
        err: error,
        method: 'GET',
        path: '/protected',
      },
      'Unhandled error at proxy boundary',
    );
  });

  it('should fail closed and log when Supabase session handling throws', async () => {
    const request = new NextRequest('http://localhost/protected');
    const error = new Error('Session refresh unavailable');

    vi.mocked(handleAccessGateRequest).mockResolvedValue(undefined);
    vi.mocked(updateSession).mockRejectedValue(error);

    const response = await proxy(request);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Internal server error',
    });
    expect(logger.error).toHaveBeenCalledWith(
      {
        err: error,
        method: 'GET',
        path: '/protected',
      },
      'Unhandled error at proxy boundary',
    );
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
    '/api/consultations/export.json',
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
    '/styles/site.css',
    '/fonts/inter.woff2',
    '/site.webmanifest',
    '/robots.txt',
    '/sitemap.xml',
  ])('should exclude framework and static asset path %s', (url) => {
    expect(
      unstable_doesMiddlewareMatch({
        config,
        url,
      }),
    ).toBe(false);
  });
});
