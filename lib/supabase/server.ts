import 'server-only';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { type NextResponse } from 'next/server';
import { getSupabaseAuthCookieOptions } from '@/lib/supabase/cookies';
import { type Database } from '@/lib/supabase/database.types';

/**
 * Especially important if using Fluid compute: Don't put this client in a
 * global variable. Always create a new client within each function when using
 * it.
 */
type ResponseCookie = { name: string; value: string; options: CookieOptions };

export const serverRequestClient = async () => {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_SUPABASE_URL!,
    process.env.NEXT_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: getSupabaseAuthCookieOptions(),
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    },
  );
};

export const serverActionClient = async () => {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_SUPABASE_URL!,
    process.env.NEXT_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: getSupabaseAuthCookieOptions(),
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );
};

export const serverResponseClient = async () => {
  const cookieStore = await cookies();
  const cookiesToSet: ResponseCookie[] = [];
  const supabase = createServerClient<Database>(
    process.env.NEXT_SUPABASE_URL!,
    process.env.NEXT_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: getSupabaseAuthCookieOptions(),
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(nextCookiesToSet) {
          nextCookiesToSet.forEach(({ name, value, options }) => {
            cookiesToSet.push({ name, value, options });
          });
        },
      },
    },
  );

  const applyServerCookies = (response: NextResponse) => {
    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
  };

  return { supabase, applyServerCookies };
};
