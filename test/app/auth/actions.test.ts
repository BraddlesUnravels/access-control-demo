import { beforeEach, describe, expect, it, vi } from 'vitest';
import { redirect } from 'next/navigation';
import { signInAction, signOutAction, signUpAction } from '@/app/auth/actions';
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
  signUp: ReturnType<typeof vi.fn>;
};

const setupServerActionClientMock = (): AuthClientMocks => {
  const signInWithPassword = vi.fn().mockResolvedValue({
    error: null,
  });

  const signOut = vi.fn().mockResolvedValue({
    error: null,
  });

  const signUp = vi.fn().mockResolvedValue({
    error: null,
  });

  vi.mocked(serverActionClient).mockResolvedValue({
    auth: {
      signInWithPassword,
      signOut,
      signUp,
    },
  } as never);

  return {
    signInWithPassword,
    signOut,
    signUp,
  };
};

const buildLoginFormData = (email: string, password: string): FormData => {
  const formData = new FormData();

  formData.set('email', email);
  formData.set('password', password);

  return formData;
};

const buildSignUpFormData = (
  email: string,
  password: string,
  repeatPassword: string,
): FormData => {
  const formData = new FormData();

  formData.set('email', email);
  formData.set('password', password);
  formData.set('repeat-password', repeatPassword);

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

    it('passes legacy-format passwords through to Supabase authentication', async () => {
      const { signInWithPassword } = setupServerActionClientMock();

      signInWithPassword.mockResolvedValue({
        error: {
          message: 'Invalid login credentials',
        },
      });

      const result = await signInAction(
        {},
        buildLoginFormData('student@example.com', 'legacy'),
      );

      expect(signInWithPassword).toHaveBeenCalledWith({
        email: 'student@example.com',
        password: 'legacy',
      });

      expect(result).toEqual({
        error: 'Invalid login credentials',
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

describe('signUpAction', () => {
  it('creates an account with validated credentials and redirects to the success page', async () => {
    const { signUp } = setupServerActionClientMock();

    await signUpAction(
      {},
      buildSignUpFormData(
        '  student@example.com  ',
        'ReviewStudent**1',
        'ReviewStudent**1',
      ),
    );

    expect(signUp).toHaveBeenCalledWith({
      email: 'student@example.com',
      password: 'ReviewStudent**1',
      options: {
        emailRedirectTo:
          'http://localhost:3000/auth/confirm-email?next=/protected',
      },
    });

    expect(redirect).toHaveBeenCalledWith('/auth/sign-up-success');
  });

  it('rejects mismatched passwords before creating a Supabase client', async () => {
    const result = await signUpAction(
      {},
      buildSignUpFormData(
        'student@example.com',
        'ReviewStudent**1',
        'DifferentPassword**1',
      ),
    );

    expect(result).toEqual({
      error: 'Passwords do not match',
    });

    expect(serverActionClient).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('returns the Supabase sign-up error without redirecting', async () => {
    const { signUp } = setupServerActionClientMock();

    signUp.mockResolvedValue({
      error: {
        message: 'User already registered',
      },
    });

    const result = await signUpAction(
      {},
      buildSignUpFormData(
        'student@example.com',
        'ReviewStudent**1',
        'ReviewStudent**1',
      ),
    );

    expect(result).toEqual({
      error: 'User already registered',
    });

    expect(redirect).not.toHaveBeenCalled();
  });
});
