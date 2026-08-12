import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { buildAppUrl } from '@/lib/app-url';
import { ACCESS_GATE_DEFAULT_DESTINATION } from '@/lib/access-gate/constants';
import type { Database } from '@/lib/supabase/database.types';

const SUPABASE_CACHE_HEADERS = ['cache-control', 'expires', 'pragma'] as const;

const copyResponseState = (
  source: NextResponse,
  target: NextResponse,
): NextResponse => {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });

  SUPABASE_CACHE_HEADERS.forEach((headerName) => {
    const value = source.headers.get(headerName);

    if (value) target.headers.set(headerName, value);
  });

  return target;
};

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );

          Object.entries(headers).forEach(([name, value]) => {
            supabaseResponse.headers.set(name, value);
          });
        },
      },
    },
  );

  /*
   * Keep getClaims immediately after creating
   * the Supabase client.
   */
  const { data } = await supabase.auth.getClaims();

  const user = data?.claims;

  const pathname = request.nextUrl.pathname.trim().toLowerCase();

  if (
    !user &&
    !pathname.startsWith('/api/') &&
    !pathname.startsWith('/auth/')
  ) {
    return copyResponseState(
      supabaseResponse,
      NextResponse.redirect(
        buildAppUrl(request, ACCESS_GATE_DEFAULT_DESTINATION),
      ),
    );
  }

  return supabaseResponse;
}
