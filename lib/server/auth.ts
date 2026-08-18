import { redirect } from 'next/navigation';
import { AppError } from '@/lib/errors';
import { serverRequestClient } from '@/lib/supabase/server';
import type { Enums } from '@/lib/supabase/database.types';

export type AppRole = Enums<'app_role'>;

export type AuthContext = {
  userId: string;
  role: AppRole;
};

/**
 * Verifies that the authenticated user has the role required by an API route.
 *
 * This function handles authorization, not authentication. Authentication and
 * profile resolution are performed separately by requireAuthContext().
 */
export const assertRole = (
  actualRole: AppRole,
  requiredRole: AppRole,
): void => {
  if (actualRole !== requiredRole) {
    throw new AppError('User does not have the required role', {
      status: 403,
      safeMessage: 'Forbidden',
      meta: {
        actualRole,
        requiredRole,
      },
    });
  }
};

export const requireAuthContext = async (
  options: { redirectOnUnauthenticated?: boolean } = {},
): Promise<AuthContext> => {
  const redirectOnUnauthenticated = options.redirectOnUnauthenticated ?? true;
  const supabase = await serverRequestClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    if (redirectOnUnauthenticated) redirect('/auth/login');
    throw new AppError('Authentication required', {
      status: 401,
      safeMessage: 'Unauthorized',
    });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileError)
    throw new AppError('Failed to load user profile', {
      status: 500,
      safeMessage: 'Internal server error',
      meta: {
        userId: data.user.id,
        code: profileError.code,
      },
    });

  if (!profile)
    throw new AppError('User profile was not found', {
      status: 500,
      safeMessage: 'Internal server error',
      meta: { userId: data.user.id },
    });

  return {
    userId: data.user.id,
    role: profile.role,
  };
};
