import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { loginInputSchema } from '@/lib/validation/schemas';
import { validateWithSchema } from '@/lib/validation/validate';

export const POST = async (request: Request) => {
  const cookieStore = await cookies();
  const cookiesToSet: { name: string; value: string; options: CookieOptions }[] = [];
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(nextCookiesToSet) {
          nextCookiesToSet.forEach(({ name, value, options }) => {
            cookiesToSet.push({ name, value, options });
          });
        },
      },
    },
  );
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }

  const validation = validateWithSchema(loginInputSchema, payload);

  if (!validation.success) {
    return NextResponse.json(
      {
        error: validation.errors[0] ?? 'Login input is invalid',
        errors: validation.errors,
        fieldErrors: validation.fieldErrors,
      },
      { status: 400 },
    );
  }

  const { email, password } = validation.data;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }
  const response = NextResponse.json({ data: { authenticated: true } }, { status: 200 });

  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  return response;
};
