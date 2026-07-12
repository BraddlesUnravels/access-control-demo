import { serverClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export type AppRole = 'student' | 'admin';

export type AuthContext = {
  userId: string;
  role: AppRole;
};

export const requireAuthContext = async (
  options: { redirectOnUnauthenticated?: boolean } = {},
): Promise<AuthContext> => {
  const redirectOnUnauthenticated = options.redirectOnUnauthenticated ?? true;
  const supabase = await serverClient();
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
    role: profile.role as AppRole,
  };
};
