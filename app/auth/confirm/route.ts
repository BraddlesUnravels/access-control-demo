import { type EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { serverResponseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const nextParam = searchParams.get('next');
  const next = nextParam?.startsWith('/') ? nextParam : '/protected';
  const { supabase, applyServerCookies } = await serverResponseClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error)
      return NextResponse.redirect(new URL('/auth/login', request.url));

    const response = NextResponse.redirect(new URL(next, request.url));
    applyServerCookies(response);

    return response;
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });

    if (error)
      return NextResponse.redirect(new URL('/auth/login', request.url));

    const response = NextResponse.redirect(new URL(next, request.url));
    applyServerCookies(response);

    return response;
  }

  return NextResponse.redirect(new URL('/auth/login', request.url));
}
