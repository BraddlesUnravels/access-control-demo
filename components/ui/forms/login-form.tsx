'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { signInAction } from '@/app/auth/actions';
import { LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormSubmitButton } from '../form-submit-button';
import { FormMessage } from '../form-message';
import { FormField } from '../form-field';
import { Input, PasswordInput } from '../input';
import { Typography } from '../typography';
import type { ComponentPropsWithoutRef } from 'react';

type LoginFormProps = Omit<ComponentPropsWithoutRef<'form'>, 'onSubmit'> & {
  initialEmail?: string;
  initialPassword?: string;
};

export function LoginForm({
  initialEmail = '',
  initialPassword = '',
  className,
  ...props
}: LoginFormProps) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState(initialPassword);

  const [state, formAction, isPending] = useActionState(signInAction, {});

  return (
    <form {...props} action={formAction} className={cn('space-y-5', className)}>
      <FormField
        label="Email"
        htmlFor="email"
        className="gap-2.5"
        labelClassName="font-semibold uppercase tracking-[0.08em] text-zinc-400"
      >
        <Input
          id="email"
          name="email"
          type="email"
          tabIndex={1}
          placeholder="example@lms.com"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(state.error)}
          aria-describedby={state.error ? 'login-error' : undefined}
          className="h-12 font-mono text-sm"
        />
      </FormField>

      <FormField
        label="Password"
        htmlFor="password"
        className="gap-2.5"
        labelClassName="font-semibold uppercase tracking-[0.08em] text-zinc-400"
        action={
          <Link
            tabIndex={5}
            href="/auth/forgot-password"
            className="text-sm font-medium text-zinc-400 underline decoration-zinc-700 underline-offset-4 transition-colors hover:text-cyan-200 hover:decoration-cyan-300/50"
          >
            Forgot password?
          </Link>
        }
      >
        <PasswordInput
          id="password"
          name="password"
          tabIndex={2}
          show-button-tab-index={3}
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={Boolean(state.error)}
          aria-describedby={state.error ? 'login-error' : undefined}
          className="h-12"
        />
      </FormField>

      {state.error && <FormMessage id="login-error">{state.error}</FormMessage>}

      <FormSubmitButton
        isLoading={isPending}
        loadingLabel="Signing in..."
        size="lg"
        className="w-full"
        tabIndex={4}
      >
        <LogIn aria-hidden="true" />
        Sign in
      </FormSubmitButton>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-white/6" />

        <Typography
          as="span"
          variant="caption"
          className="font-mono uppercase tracking-[0.14em] text-zinc-700"
        >
          Authenticated users
        </Typography>

        <div className="h-px flex-1 bg-white/6" />
      </div>

      <Typography
        as="p"
        variant="body-small"
        className="text-center leading-5 text-zinc-600"
      >
        Don&apos;t have an account?{' '}
        <Link
          tabIndex={6}
          href="/auth/sign-up"
          className="font-medium text-zinc-400 underline decoration-zinc-700 underline-offset-4 transition-colors hover:text-cyan-200 hover:decoration-cyan-300/50"
        >
          Sign up
        </Link>
      </Typography>
    </form>
  );
}
