import 'server-only';

import type { CookieOptions } from '@supabase/ssr';
import { isAzureEnv } from '@/lib/utils';

export const getSupabaseAuthCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: isAzureEnv(),
  path: '/',
});
