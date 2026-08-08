import { handleAccessGateRequest } from '@/lib/access-gate/proxy';
import { updateSession } from '@/lib/supabase/proxy';
import { type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  const accessGateResponse = handleAccessGateRequest(request);

  if (accessGateResponse) return accessGateResponse;

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/health (container and platform probes must not depend on Supabase)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - common image assets
     */
    '/((?!api/health(?:/|$)|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
