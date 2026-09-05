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
  supabase: {
    auth: { getUser: ReturnType<typeof vi.fn> };
    from: ReturnType<typeof vi.fn>;
  };
};

const setupserverRequestClientMock = (): ServerAuthMocks => {
  const getUser = vi.fn();
  const maybeSingle = vi.fn();
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  const supabase = {
    auth: { getUser },
    from,
  };

  vi.mocked(serverRequestClient).mockResolvedValue(supabase as never);

  return {
    eq,
    getUser,
    maybeSingle,
    supabase,
  };
};

describe('lib/server/auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return user id and role when user and profile are available', async () => {
    const { eq, getUser, maybeSingle, supabase } =
      setupserverRequestClientMock();
    getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    maybeSingle.mockResolvedValue({ data: { role: 'admin' }, error: null });

    const authContext = await requireAuthContext({
      redirectOnUnauthenticated: false,
    });

    expect(eq).toHaveBeenCalledWith('id', 'user-1');
    expect(authContext).toEqual({
      supabase,
      role: 'admin',
      userId: 'user-1',
    });
  });

  it('should throw a 401 AppError when user is missing and redirect is disabled', async () => {
    const { getUser } = setupserverRequestClientMock();
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    let thrownError: unknown;

    try {
      await requireAuthContext({ redirectOnUnauthenticated: false });
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toBeInstanceOf(AppError);
    expect(thrownError).toMatchObject({
      message: 'Authentication required',
      status: 401,
      safeMessage: 'Unauthorized',
    });
    expect(vi.mocked(redirect)).not.toHaveBeenCalled();
  });

  it('should redirect to login when unauthenticated and redirect is enabled', async () => {
    const { getUser } = setupserverRequestClientMock();
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(requireAuthContext()).rejects.toMatchObject({
      status: 401,
      safeMessage: 'Unauthorized',
    });

    expect(vi.mocked(redirect)).toHaveBeenCalledWith('/auth/login');
  });

  it('should throw a structured error when profile lookup fails', async () => {
    const { getUser, maybeSingle } = setupserverRequestClientMock();
    getUser.mockResolvedValue({
      data: { user: { id: 'user-2' } },
      error: null,
    });
    maybeSingle.mockResolvedValue({
      data: null,
      error: {
        code: 'PGRST500',
        message: 'Database unavailable',
      },
    });

    await expect(
      requireAuthContext({ redirectOnUnauthenticated: false }),
    ).rejects.toMatchObject({
      message: 'Failed to load user profile',
      status: 500,
      safeMessage: 'Internal server error',
      meta: {
        userId: 'user-2',
        code: 'PGRST500',
      },
    });
  });

  it('should throw a structured error when profile row is missing', async () => {
    const { getUser, maybeSingle } = setupserverRequestClientMock();
    getUser.mockResolvedValue({
      data: { user: { id: 'user-2' } },
      error: null,
    });
    maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(
      requireAuthContext({ redirectOnUnauthenticated: false }),
    ).rejects.toMatchObject({
      message: 'User profile was not found',
      status: 500,
      safeMessage: 'Internal server error',
      meta: {
        userId: 'user-2',
      },
    });
  });
});

describe('assertRole', () => {
  it('should allow a user with the required role', () => {
    expect(() => {
      assertRole('student', 'student');
    }).not.toThrow();
  });

  it('should reject a user with a different role', () => {
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
