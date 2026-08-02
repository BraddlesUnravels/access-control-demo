import { beforeEach, describe, expect, it, vi } from 'vitest';
import { redirect } from 'next/navigation';
import { AppError } from '@/lib/errors';
import { requireAuthContext, assertRole } from '@/lib/server/auth';
import { serverRequestClient } from '@/lib/supabase/server';

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  serverRequestClient: vi.fn(),
}));

type ServerAuthMocks = {
  eq: ReturnType<typeof vi.fn>;
  getUser: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
};

const setupserverRequestClientMock = (): ServerAuthMocks => {
  const getUser = vi.fn();
  const maybeSingle = vi.fn();
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));

  vi.mocked(serverRequestClient).mockResolvedValue({
    auth: { getUser },
    from,
  } as never);

  return {
    eq,
    getUser,
    maybeSingle,
  };
};

describe('lib/server/auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return user id and role when user and profile are available', async () => {
    const { eq, getUser, maybeSingle } = setupserverRequestClientMock();
    getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    maybeSingle.mockResolvedValue({ data: { role: 'admin' }, error: null });

    const authContext = await requireAuthContext({
      redirectOnUnauthenticated: false,
    });

    expect(eq).toHaveBeenCalledWith('id', 'user-1');
    expect(authContext).toEqual({ role: 'admin', userId: 'user-1' });
  });

  it('should throw unauthenticated error when user is missing and redirect is disabled', async () => {
    const { getUser } = setupserverRequestClientMock();
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(
      requireAuthContext({ redirectOnUnauthenticated: false }),
    ).rejects.toThrow('Unauthenticated');
    expect(vi.mocked(redirect)).not.toHaveBeenCalled();
  });

  it('should redirect to login when unauthenticated and redirect is enabled', async () => {
    const { getUser } = setupserverRequestClientMock();
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(requireAuthContext()).rejects.toThrow('Unauthenticated');
    expect(vi.mocked(redirect)).toHaveBeenCalledWith('/auth/login');
  });

  it('should throw when profile row is missing', async () => {
    const { getUser, maybeSingle } = setupserverRequestClientMock();
    getUser.mockResolvedValue({
      data: { user: { id: 'user-2' } },
      error: null,
    });
    maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(
      requireAuthContext({ redirectOnUnauthenticated: false }),
    ).rejects.toThrow('User profile was not found');
  });
});

describe('assertRole', () => {
  it('allows a user with the required role', () => {
    expect(() => {
      assertRole('student', 'student');
    }).not.toThrow();
  });

  it('rejects a user with a different role', () => {
    let thrownError: unknown;

    try {
      assertRole('admin', 'student');
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toBeInstanceOf(AppError);
    expect(thrownError).toMatchObject({
      status: 403,
      safeMessage: 'Forbidden',
      meta: {
        actualRole: 'admin',
        requiredRole: 'student',
      },
    });
  });
});
