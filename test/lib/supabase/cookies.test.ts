import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSupabaseAuthCookieOptions } from '@/lib/supabase/cookies';

describe('lib/supabase/cookies', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should create HttpOnly local auth cookies with a lax same-site policy', () => {
    vi.stubEnv('CONTAINER_APP_NAME', '');
    vi.stubEnv('CONTAINER_APP_ENV_DNS_SUFFIX', '');

    expect(getSupabaseAuthCookieOptions()).toEqual({
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
    });
  });

  it('should create secure Azure auth cookies', () => {
    vi.stubEnv('CONTAINER_APP_NAME', 'aca-access-control-demo');
    vi.stubEnv(
      'CONTAINER_APP_ENV_DNS_SUFFIX',
      'example.australiaeast.azurecontainerapps.io',
    );

    expect(getSupabaseAuthCookieOptions()).toEqual({
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
    });
  });
});
