import { createServerClient, type SetAllCookies } from '@supabase/ssr';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { updateSession } from '@/lib/supabase/proxy';

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}));

const AZURE_CONTAINER_APP_NAME = 'aca-access-control-demo';

const AZURE_ENV_DNS_SUFFIX = 'example.australiaeast.azurecontainerapps.io';

const CUSTOM_DOMAIN = 'braddlesunravels.online';

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

    /*
     * Default to local/non-Azure behaviour.
     */
    vi.stubEnv('CONTAINER_APP_NAME', '');

    vi.stubEnv('CONTAINER_APP_ENV_DNS_SUFFIX', '');

    vi.stubEnv('AZURE_CUSTOM_DOMAIN', '');
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

  it('should use the custom domain for unauthenticated redirects in Azure', async () => {
    vi.stubEnv('CONTAINER_APP_NAME', AZURE_CONTAINER_APP_NAME);

    vi.stubEnv('CONTAINER_APP_ENV_DNS_SUFFIX', AZURE_ENV_DNS_SUFFIX);

    vi.stubEnv('AZURE_CUSTOM_DOMAIN', CUSTOM_DOMAIN);

    setupSupabaseMock({
      claims: null,
    });

    const response = await updateSession(
      new NextRequest('http://0.0.0.0:3000/protected'),
    );

    expect(response.status).toBe(307);

    expect(response.headers.get('location')).toBe(
      'https://braddlesunravels.online/auth/login',
    );
  });

  it('should fall back to the Azure-generated FQDN when no custom domain is available', async () => {
    vi.stubEnv('CONTAINER_APP_NAME', AZURE_CONTAINER_APP_NAME);

    vi.stubEnv('CONTAINER_APP_ENV_DNS_SUFFIX', AZURE_ENV_DNS_SUFFIX);

    vi.stubEnv('AZURE_CUSTOM_DOMAIN', '');

    setupSupabaseMock({
      claims: null,
    });

    const response = await updateSession(
      new NextRequest('http://0.0.0.0:3000/protected'),
    );

    expect(response.status).toBe(307);

    expect(response.headers.get('location')).toBe(
      'https://aca-access-control-demo.example.australiaeast.azurecontainerapps.io/auth/login',
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
