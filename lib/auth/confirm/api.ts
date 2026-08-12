import { NextRequest, NextResponse } from 'next/server';
import { buildAppUrl } from '@/lib/app-url';

export const INTERNAL_ORIGIN = 'http://auth.internal';
export const DEFAULT_DESTINATION = '/protected';
export const LOGIN_PATH = '/auth/login';
export type RedirectStatus = 303 | 307;

export const getSafeNextDestination = (value: string | null): string => {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return DEFAULT_DESTINATION;
  }

  let destination: URL;

  try {
    destination = new URL(value, INTERNAL_ORIGIN);
  } catch {
    return DEFAULT_DESTINATION;
  }

  if (destination.origin !== INTERNAL_ORIGIN) {
    return DEFAULT_DESTINATION;
  }

  return `${destination.pathname}${destination.search}${destination.hash}`;
};

export const redirectToLogin = (
  request: NextRequest,
  status: RedirectStatus,
): NextResponse => {
  return NextResponse.redirect(buildAppUrl(request, LOGIN_PATH), status);
};

export const redirectWithCookies = (
  request: NextRequest,
  destination: string,
  applyServerCookies: (response: NextResponse) => void,
  status: RedirectStatus,
): NextResponse => {
  const response = NextResponse.redirect(
    buildAppUrl(request, destination),
    status,
  );

  applyServerCookies(response);

  return response;
};
