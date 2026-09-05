import { NextResponse, type NextRequest } from 'next/server';
import { buildAppUrl } from '../app-url';
import { ACCESS_GATE_COOKIE_NAME, ACCESS_GATE_ENTRY_PATH } from './constants';
import { verifyAccessGateCookieValue } from './cookie';
import { isAccessGateDisabled, tryGetAccessGateCookieSecret } from './env';
import { getSafeAccessGateDestination, isAccessGatePublicPath } from './paths';
import { accessGateSessionCache } from './session-cache';

const clearAccessGateCookie = (response: NextResponse): NextResponse => (
  response.cookies.delete(ACCESS_GATE_COOKIE_NAME),
  response
);

const getAccessGateCookiePayload = (request: NextRequest) => {
  const secret = tryGetAccessGateCookieSecret();

  if (!secret) return;

  const cookieValue = request.cookies.get(ACCESS_GATE_COOKIE_NAME)?.value;

  if (!cookieValue) return;

  return verifyAccessGateCookieValue(cookieValue, secret);
};

export const hasValidAccessGateCookie = (request: NextRequest): boolean =>
  Boolean(getAccessGateCookiePayload(request));

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

export const handleAccessGateRequest = async (
  request: NextRequest,
): Promise<NextResponse | undefined> => {
  const pathname = request.nextUrl.pathname.trim().toLowerCase();

  if (isAccessGateDisabled()) {
    if (pathname === ACCESS_GATE_ENTRY_PATH)
      return buildDestinationRedirect(request);

    return;
  }

  const hasCookie = request.cookies.has(ACCESS_GATE_COOKIE_NAME);
  const cookiePayload = getAccessGateCookiePayload(request);

  if (pathname === ACCESS_GATE_ENTRY_PATH) {
    if (cookiePayload) return buildDestinationRedirect(request);

    const response = NextResponse.next({ request });

    return hasCookie ? clearAccessGateCookie(response) : response;
  }

  if (isAccessGatePublicPath(pathname)) return NextResponse.next({ request });

  if (cookiePayload) {
    const hasValidSession =
      await accessGateSessionCache.hasValidSession(cookiePayload);

    if (hasValidSession) return;
  }

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
