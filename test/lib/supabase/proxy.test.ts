import { createServerClient, type SetAllCookies } from '@supabase/ssr';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { updateSession } from '@/lib/supabase/proxy';

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}));

type CookiesToSet = Parameters<SetAllCookies>[0];

const setupSupabaseMock = ({
  claims,
  cookiesToSet = [],
}: {
  claims: Record<string, unknown> | null;
  cookiesToSet?: CookiesToSet;
}) => {
  const getClaims = vi.fn();

  vi.mocked(createServerClient).mockImplementation((_url, _key, options) => {
    const setAll = options.cookies.setAll;

    if (!setAll) {
      throw new Error('Expected Supabase setAll cookie adapter');
    }

    getClaims.mockImplementation(async () => {
      if (cookiesToSet.length > 0) {
        await setAll(cookiesToSet, {});
      }

      return {
        data: {
          claims,
        },
      };
    });

    return {
      auth: {
        getClaims,
      },
    } as never;
  });

  return getClaims;
};

describe('lib/supabase/proxy', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:54321');

    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'test-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should continue when authenticated claims are present', async () => {
    const getClaims = setupSupabaseMock({
      claims: {
        sub: 'user-1',
      },
    });

    const response = await updateSession(
      new NextRequest('http://localhost/protected'),
    );

    expect(getClaims).toHaveBeenCalledOnce();

    expect(response.status).toBe(200);

    expect(response.headers.get('location')).toBeNull();
  });

  it('should redirect an unauthenticated page request to login', async () => {
    setupSupabaseMock({
      claims: null,
    });

    const response = await updateSession(
      new NextRequest('http://localhost/protected?tab=upcoming'),
    );

    expect(response.status).toBe(307);

    expect(response.headers.get('location')).toBe(
      'http://localhost/auth/login',
    );
  });

  it('should preserve Supabase refresh cookies on an unauthenticated redirect', async () => {
    setupSupabaseMock({
      claims: null,
      cookiesToSet: [
        {
          name: 'sb-refresh-token',
          value: 'refreshed-token',
          options: {
            httpOnly: true,
            path: '/',
          },
        },
      ],
    });

    const response = await updateSession(
      new NextRequest('http://localhost/protected'),
    );

    expect(response.status).toBe(307);

    expect(response.cookies.get('sb-refresh-token')?.value).toBe(
      'refreshed-token',
    );
  });

  it('should not redirect unauthenticated auth routes', async () => {
    setupSupabaseMock({
      claims: null,
    });

    const response = await updateSession(
      new NextRequest('http://localhost/auth/login'),
    );

    expect(response.status).toBe(200);

    expect(response.headers.get('location')).toBeNull();
  });

  it('should not convert unauthenticated API requests into page redirects', async () => {
    setupSupabaseMock({
      claims: null,
    });

    const response = await updateSession(
      new NextRequest('http://localhost/api/consultations'),
    );

    expect(response.status).toBe(200);

    expect(response.headers.get('location')).toBeNull();
  });
});
