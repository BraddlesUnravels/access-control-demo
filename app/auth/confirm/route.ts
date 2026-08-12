import { type EmailOtpType } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import {
  getSafeNextDestination,
  redirectToLogin,
  redirectWithCookies,
} from '@/lib/auth/confirm/api';
import { serverResponseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const tokenHash = request.nextUrl.searchParams.get('token_hash');
  const type = request.nextUrl.searchParams.get('type') as
    EmailOtpType | undefined;

  const next = getSafeNextDestination(request.nextUrl.searchParams.get('next'));

  if (code) {
    const { supabase, applyServerCookies } = await serverResponseClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) return redirectToLogin(request, 307);

    return redirectWithCookies(request, next, applyServerCookies, 307);
  }

  /*
   * Signup email confirmations use type=email and must
   * never be consumed through GET.
   *
   * They are handled through POST below after the browser
   * reads the token from the URL fragment.
   */
  if (!tokenHash || !type || type === 'email')
    return redirectToLogin(request, 307);

  /*
   * Preserve existing non-signup token-hash flows,
   * such as recovery.
   */
  const { supabase, applyServerCookies } = await serverResponseClient();

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error) {
    return redirectToLogin(request, 307);
  }

  return redirectWithCookies(request, next, applyServerCookies, 307);
}

export async function POST(request: NextRequest) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return redirectToLogin(request, 303);
  }

  const tokenHash = formData.get('token_hash');
  const type = formData.get('type');
  const nextValue = formData.get('next');
  const honeypot = formData.get('website');

  const next = getSafeNextDestination(
    typeof nextValue === 'string' ? nextValue : null,
  );

  /*
   * A real user never interacts with this off-screen
   * field. Reject before touching Supabase so automated
   * form fillers cannot consume the one-time token.
   */
  if (typeof honeypot === 'string' && honeypot.trim().length > 0)
    return redirectToLogin(request, 303);

  if (
    typeof tokenHash !== 'string' ||
    tokenHash.length === 0 ||
    type !== 'email'
  )
    return redirectToLogin(request, 303);

  const { supabase, applyServerCookies } = await serverResponseClient();

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'email',
  });

  if (error) return redirectToLogin(request, 303);

  /*
   * 303 is deliberate here.
   *
   * The confirmation arrived as POST, but the browser
   * should navigate to /protected with GET afterward.
   */
  return redirectWithCookies(request, next, applyServerCookies, 303);
}
