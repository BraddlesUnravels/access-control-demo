import { beforeEach, describe, expect, it, vi } from 'vitest';
import { redirect } from 'next/navigation';
import { signInAction, signOutAction } from '@/app/auth/actions';
import { serverActionClient } from '@/lib/supabase/server';

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  serverActionClient: vi.fn(),
}));

type AuthClientMocks = {
  signInWithPassword: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
};

const setupServerActionClientMock = (): AuthClientMocks => {
  const signInWithPassword = vi.fn().mockResolvedValue({
    error: null,
  });

  const signOut = vi.fn().mockResolvedValue({
    error: null,
  });

  vi.mocked(serverActionClient).mockResolvedValue({
    auth: {
      signInWithPassword,
      signOut,
    },
  } as never);

  return {
    signInWithPassword,
    signOut,
  };
};

const buildLoginFormData = (email: string, password: string): FormData => {
  const formData = new FormData();

  formData.set('email', email);
  formData.set('password', password);

  return formData;
};

describe('app/auth/actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signInAction', () => {
    it('rejects invalid login input before creating a Supabase client', async () => {
      const result = await signInAction(
        {},
        buildLoginFormData('not-an-email', 'password'),
      );

      expect(result).toEqual({
        error: 'Please enter a valid email address',
      });

      expect(serverActionClient).not.toHaveBeenCalled();
      expect(redirect).not.toHaveBeenCalled();
    });

    it('signs in with validated credentials and redirects to the protected area', async () => {
      const { signInWithPassword } = setupServerActionClientMock();

      await signInAction(
        {},
        buildLoginFormData('  student@example.com  ', 'TestPassword1!'),
      );

      expect(signInWithPassword).toHaveBeenCalledWith({
        email: 'student@example.com',
        password: 'TestPassword1!',
      });

      expect(redirect).toHaveBeenCalledWith('/protected');
    });

    it('returns the Supabase authentication error without redirecting', async () => {
      const { signInWithPassword } = setupServerActionClientMock();

      signInWithPassword.mockResolvedValue({
        error: {
          message: 'Password must contain at least one uppercase letter',
        },
      });

      const result = await signInAction(
        {},
        buildLoginFormData('student@example.com', 'wrong-password'),
      );

      expect(result).toEqual({
        error: 'Password must contain at least one uppercase letter',
      });

      expect(redirect).not.toHaveBeenCalled();
    });
  });

  describe('signOutAction', () => {
    it('signs out and redirects to the login page', async () => {
      const { signOut } = setupServerActionClientMock();

      await signOutAction();

      expect(signOut).toHaveBeenCalledOnce();
      expect(redirect).toHaveBeenCalledWith('/auth/login');
    });

    it('does not redirect when sign out fails', async () => {
      const { signOut } = setupServerActionClientMock();

      const signOutError = new Error('Failed to sign out');

      signOut.mockResolvedValue({
        error: signOutError,
      });

      await expect(signOutAction()).rejects.toThrow('Failed to sign out');

      expect(redirect).not.toHaveBeenCalled();
    });
  });
});
