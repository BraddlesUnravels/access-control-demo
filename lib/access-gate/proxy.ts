import { NextResponse, type NextRequest } from 'next/server';
import { buildAppUrl } from '@/lib/app-url';
import {
  ACCESS_GATE_COOKIE_NAME,
  ACCESS_GATE_ENTRY_PATH,
} from '@/lib/access-gate/constants';
import { verifyAccessGateCookieValue } from '@/lib/access-gate/cookie';
import {
  isAccessGateDisabled,
  tryGetAccessGateCookieSecret,
} from '@/lib/access-gate/env';
import {
  getSafeAccessGateDestination,
  isAccessGatePublicPath,
} from '@/lib/access-gate/paths';
import { isAzureEnv } from '@/lib/utils';

const clearAccessGateCookie = (response: NextResponse): NextResponse => {
  response.cookies.set({
    name: ACCESS_GATE_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: isAzureEnv(),
    path: '/',
    expires: new Date(0),
  });

  return response;
};

const hasValidAccessGateCookie = (request: NextRequest): boolean => {
  const secret = tryGetAccessGateCookieSecret();

  if (!secret) return false;

  const cookieValue = request.cookies.get(ACCESS_GATE_COOKIE_NAME)?.value;

  if (!cookieValue) return false;

  return Boolean(verifyAccessGateCookieValue(cookieValue, secret));
};

const buildEntryRedirect = (request: NextRequest): NextResponse => {
  const requestedPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const redirectUrl = buildAppUrl(request, ACCESS_GATE_ENTRY_PATH);

  redirectUrl.searchParams.set('next', requestedPath);
  return NextResponse.redirect(redirectUrl);
};

const buildDestinationRedirect = (request: NextRequest): NextResponse => {
  const destination = getSafeAccessGateDestination(
    request.nextUrl.searchParams.get('next'),
  );

  return NextResponse.redirect(buildAppUrl(request, destination));
};

export const handleAccessGateRequest = (
  request: NextRequest,
): NextResponse | undefined => {
  const pathname = request.nextUrl.pathname.trim().toLowerCase();

  if (isAccessGateDisabled()) {
    if (pathname === ACCESS_GATE_ENTRY_PATH)
      return buildDestinationRedirect(request);

    return;
  }

  const hasCookie = request.cookies.has(ACCESS_GATE_COOKIE_NAME);
  const hasValidCookie = hasValidAccessGateCookie(request);

  if (pathname === ACCESS_GATE_ENTRY_PATH) {
    if (hasValidCookie) return buildDestinationRedirect(request);

    const response = NextResponse.next({ request });

    return hasCookie ? clearAccessGateCookie(response) : response;
  }

  if (isAccessGatePublicPath(pathname)) return NextResponse.next({ request });

  if (hasValidCookie) return;

  const response = pathname.startsWith('/api/')
    ? NextResponse.json(
        { error: 'Access invite is required.' },
        {
          status: 401,
          headers: { 'Cache-Control': 'no-store' },
        },
      )
    : buildEntryRedirect(request);

  return hasCookie ? clearAccessGateCookie(response) : response;
};
