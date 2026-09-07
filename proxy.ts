import { handleAccessGateRequest } from '@/lib/access-gate/proxy';
import { logger } from '@/lib/logger';
import { updateSession } from '@/lib/supabase/proxy';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  try {
    const accessGateResponse = await handleAccessGateRequest(request);

    if (accessGateResponse) return accessGateResponse;

    return await updateSession(request);
  } catch (error) {
    logger.error(
      {
        err: error,
        method: request.method,
        path: request.nextUrl.pathname,
      },
      'Unhandled error at proxy boundary',
    );

    return NextResponse.json(
      { error: 'Internal server error' },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/health (container and platform probes must not depend on Supabase)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - public files with a file extension
     */
    '/((?!api/health(?:/|$)|_next/static|_next/image|(?!api(?:/|$)).*\\.[^/]+$).*)',
  ],
};
