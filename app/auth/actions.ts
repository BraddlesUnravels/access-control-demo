'use server';

import { redirect } from 'next/navigation';
import { serverActionClient } from '@/lib/supabase/server';
import { loginInputSchema } from '@/lib/validation/schemas/auth';
import { validateWithSchema } from '@/lib/validation/validate';

export type SignInActionState = {
  error?: string;
};

export async function signInAction(
  _previousState: SignInActionState,
  formData: FormData,
): Promise<SignInActionState> {
  const validation = validateWithSchema(loginInputSchema, {
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!validation.success)
    return {
      error:
        validation.fieldErrors.email?.[0] ??
        validation.fieldErrors.password?.[0] ??
        validation.errors[0] ??
        'Invalid login details',
    };

  const supabase = await serverActionClient();

  const { error } = await supabase.auth.signInWithPassword(validation.data);

  if (error)
    return {
      error: error.message,
    };

  redirect('/protected');
}

export async function signOutAction(): Promise<void> {
  const supabase = await serverActionClient();

  const { error } = await supabase.auth.signOut();

  if (error) throw error;

  redirect('/auth/login');
}
