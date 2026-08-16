'use server';

import { redirect } from 'next/navigation';
import { serverActionClient } from '@/lib/supabase/server';
import {
  LoginInputSchema,
  PasswordResetRequestSchema,
  UpdatePasswordInputSchema,
} from '@/lib/validation/schemas/auth';
import { getAppOrigin } from '@/lib/app-url';
import { validateWithSchema } from '@/lib/validation/validate';

export type SignInActionState = {
  error?: string;
};

export async function signInAction(
  _previousState: SignInActionState,
  formData: FormData,
): Promise<SignInActionState> {
  const validation = validateWithSchema(LoginInputSchema, {
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

export type PasswordResetRequestActionState = {
  error?: string;
  success?: boolean;
};

export type UpdatePasswordActionState = {
  error?: string;
};

export async function requestPasswordResetAction(
  _previousState: PasswordResetRequestActionState,
  formData: FormData,
): Promise<PasswordResetRequestActionState> {
  const validation = validateWithSchema(PasswordResetRequestSchema, {
    email: formData.get('email'),
  });

  if (!validation.success)
    return {
      error:
        validation.fieldErrors.email?.[0] ??
        validation.errors[0] ??
        'Invalid email address',
    };

  const supabase = await serverActionClient();

  const redirectTo = new URL(
    '/auth/confirm?next=/auth/update-password',
    `${getAppOrigin()}`,
  ).toString();

  const { error } = await supabase.auth.resetPasswordForEmail(
    validation.data.email,
    {
      redirectTo,
    },
  );

  if (error)
    return {
      error: error.message,
    };

  return {
    success: true,
  };
}

export const updatePasswordAction = async (
  _previousState: UpdatePasswordActionState,
  formData: FormData,
): Promise<UpdatePasswordActionState> => {
  const validation = validateWithSchema(UpdatePasswordInputSchema, {
    password: formData.get('password'),
    repeatPassword: formData.get('repeatPassword'),
  });

  if (!validation.success)
    return {
      error:
        validation.fieldErrors.password?.[0] ??
        validation.fieldErrors.repeatPassword?.[0] ??
        validation.errors[0] ??
        'Invalid password details',
    };

  const supabase = await serverActionClient();

  const {
    data: { user },
    error: UserError,
  } = await supabase.auth.getUser();

  if (UserError || !user)
    return {
      error:
        'Your password reset session is invalid or has expired. Request a new reset link.',
    };

  const { error } = await supabase.auth.updateUser({
    password: validation.data.password,
  });

  if (error)
    return {
      error: error.message,
    };

  redirect('/auth/login');
};
