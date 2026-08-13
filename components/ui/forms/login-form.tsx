'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LogIn, EyeClosed, Eye } from 'lucide-react';
import { browserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { FormSubmitButton } from '../form-submit-button';
import { FormMessage } from '../form-message';
import { FormField } from '../form-field';
import { Input } from '../input';
import { Typography } from '../typography';

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'form'>) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin: React.SubmitEventHandler<HTMLFormElement> = async (
    event,
  ) => {
    event.preventDefault();

    const supabase = browserClient();

    setIsLoading(true);
    setError(undefined);

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) throw loginError;

      setEmail('');
      setPassword('');

      router.replace('/protected');
    } catch (loginError) {
      setError(
        loginError instanceof Error ? loginError.message : 'Failed to login',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleLogin}
      className={cn('space-y-5', className)}
      {...props}
    >
      <FormField
        label="Email"
        htmlFor="email"
        className="gap-2.5"
        labelClassName="font-semibold uppercase tracking-[0.08em] text-zinc-400"
      >
        <Input
          id="email"
          type="email"
          placeholder="example@lms.com"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'login-error' : undefined}
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
            tabIndex={-1}
            href="/auth/forgot-password"
            className="text-sm font-medium text-zinc-400 underline decoration-zinc-700 underline-offset-4 transition-colors hover:text-cyan-200 hover:decoration-cyan-300/50"
          >
            Forgot password?
          </Link>
        }
      >
        <Input
          id="password"
          type={showPassword ? 'password' : 'text'}
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'login-error' : undefined}
          className="h-12"
          endIcon={
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="text-zinc-500 transition-colors hover:text-zinc-400 hover:cursor-pointer"
            >
              {showPassword ? (
                <EyeClosed className="size-5" aria-hidden="true" />
              ) : (
                <Eye className="size-5" aria-hidden="true" />
              )}
            </button>
          }
        />
      </FormField>

      {error && <FormMessage id="login-error">{error}</FormMessage>}

      <FormSubmitButton
        isLoading={isLoading}
        loadingLabel="Signing in..."
        size="lg"
        className="w-full"
      >
        <LogIn aria-hidden="true" />
        Sign in
      </FormSubmitButton>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-white/[0.06]" />

        <Typography
          as="span"
          variant="caption"
          className="font-mono uppercase tracking-[0.14em] text-zinc-700"
        >
          Authenticated users
        </Typography>

        <div className="h-px flex-1 bg-white/[0.06]" />
      </div>

      <Typography
        as="p"
        variant="body-small"
        className="text-center leading-5 text-zinc-600"
      >
        Don&apos;t have an account?{' '}
        <Link
          href="/auth/sign-up"
          className="font-medium text-zinc-400 underline decoration-zinc-700 underline-offset-4 transition-colors hover:text-cyan-200 hover:decoration-cyan-300/50"
        >
          Sign up
        </Link>
      </Typography>
    </form>
  );
}
