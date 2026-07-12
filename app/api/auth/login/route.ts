import { NextResponse } from 'next/server';
import { AppError } from '@/lib/errors';
import { serverResponseClient } from '@/lib/supabase/server';
import { loginInputSchema } from '@/lib/validation/schemas';
import { validateWithSchema } from '@/lib/validation/validate';
import { withApiHandler } from '@/lib/with-api-handler';

export const POST = withApiHandler(async (request: Request) => {
  const { supabase, applyServerCookies } = await serverResponseClient();
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    throw new AppError('Request body must be valid JSON', {
      status: 400,
      safeMessage: 'Request body must be valid JSON',
    });
  }

  const validation = validateWithSchema(loginInputSchema, payload);

  if (!validation.success)
    return NextResponse.json(
      {
        error: validation.errors[0] ?? 'Login input is invalid',
        errors: validation.errors,
        fieldErrors: validation.fieldErrors,
      },
      { status: 400 },
    );

  const { email, password } = validation.data;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error)
    throw new AppError('Invalid email or password', {
      status: 401,
      safeMessage: 'Invalid email or password',
    });

  const response = NextResponse.json({ data: { authenticated: true } }, { status: 200 });
  applyServerCookies(response);

  return response;
});
