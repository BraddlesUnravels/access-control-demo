import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { ACCESS_GATE_COOKIE_NAME } from '@/lib/access-gate/constants';
import { verifyAccessGateCookieValue } from '@/lib/access-gate/cookie';
import {
  isAccessGateDisabled,
  tryGetAccessGateSecret,
} from '@/lib/access-gate/env';
import { isAccessGatePublicPath } from '@/lib/access-gate/paths';

const hasValidAccessGateCookie = (request: NextRequest): boolean => {
  if (isAccessGateDisabled()) {
    return true;
  }

  const secret = tryGetAccessGateSecret();

  if (!secret) {
    return false;
  }

  const cookieValue = request.cookies.get(ACCESS_GATE_COOKIE_NAME)?.value;

  if (!cookieValue) {
    return false;
  }

  return Boolean(verifyAccessGateCookieValue(cookieValue, secret));
};

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const pathname = request.nextUrl.pathname;

  if (!isAccessGatePublicPath(pathname) && !hasValidAccessGateCookie(request)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Access invite is required.' },
        { status: 401 },
      );
    }

    const url = request.nextUrl.clone();
    url.pathname = '/access';
    url.search = '';

    if (pathname !== '/' && pathname !== '/access') {
      url.searchParams.set('next', pathname);
    }

    return NextResponse.redirect(url);
  }

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (
    pathname !== '/' &&
    !user &&
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/login') &&
    !pathname.startsWith('/auth') &&
    !pathname.startsWith('/access')
  ) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
