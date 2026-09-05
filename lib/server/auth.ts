import { redirect } from 'next/navigation';
import { AppError } from '../errors';
import { serverRequestClient } from '../supabase/server';
import type { Enums } from '../supabase/database.types';
import type { PostgrestError } from '@supabase/supabase-js';

export type AppRole = Enums<'app_role'>;

export type AuthContext = {
  supabase: Awaited<ReturnType<typeof serverRequestClient>>;
  userId: string;
  role: AppRole;
};

type RequireAuthOptions = {
  redirectOnUnauthenticated?: boolean;
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
  options: RequireAuthOptions = {},
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

  if (!profile || profileError)
    return checkAndThrowProfileErrors(data.user.id, profileError);

  return {
    supabase,
    userId: data.user.id,
    role: profile.role,
  };
};

const checkAndThrowProfileErrors = (
  userId: string,
  profileError: PostgrestError | null,
): never => {
  if (profileError)
    throw new AppError('Failed to load user profile', {
      status: 500,
      safeMessage: 'Internal server error',
      meta: {
        userId,
        code: profileError.code,
      },
    });

  throw new AppError('User profile was not found', {
    status: 500,
    safeMessage: 'Internal server error',
    meta: {
      userId,
    },
  });
};
