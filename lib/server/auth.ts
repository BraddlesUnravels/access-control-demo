import { redirect } from 'next/navigation';
import { AppError } from '@/lib/errors';
import { serverRequestClient } from '@/lib/supabase/server';

export type AppRole = 'student' | 'admin';

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
    throw new Error('Unauthenticated');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileError) throw new Error('Failed to load user profile');
  if (!profile) throw new Error('User profile was not found');

  return {
    userId: data.user.id,
    role: profile.role,
  };
};
