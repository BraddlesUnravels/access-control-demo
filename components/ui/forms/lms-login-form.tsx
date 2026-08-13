'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { KeyRound, LogIn, ShieldCheck } from 'lucide-react';
import { browserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (event: React.SubmitEvent) => {
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
      router.refresh();
    } catch (loginError) {
      setError(
        loginError instanceof Error ? loginError.message : 'Failed to login',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn('mx-auto w-full max-w-[460px]', className)} {...props}>
      <div className="rounded-[28px] border border-white/[0.1] bg-white/[0.055] p-1.5 shadow-[0_32px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="rounded-[22px] border border-white/[0.07] bg-[#0d1119]/95 p-7 sm:p-9">
          <div className="mb-8">
            <div className="mb-7 flex items-start justify-between">
              <div className="flex size-12 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <KeyRound className="size-5 text-cyan-200" aria-hidden="true" />
              </div>

              <span className="rounded-full border border-white/[0.07] bg-white/[0.035] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.15em] text-zinc-600">
                Gate 02
              </span>
            </div>

            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-cyan-300">
              Application authentication
            </p>

            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-[2.1rem]">
              Sign in to the LMS
            </h1>

            <p className="mt-4 text-sm leading-6 text-zinc-500">
              Authenticate with one of the demonstration accounts to continue to
              its role-scoped workspace.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2.5">
              <Label
                htmlFor="email"
                className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-400"
              >
                Email
              </Label>

              <Input
                id="email"
                type="email"
                placeholder="example@lms.com"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-12 font-mono text-sm"
              />
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <Label
                  htmlFor="password"
                  className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-400"
                >
                  Password
                </Label>

                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-zinc-600 underline-offset-4 transition-colors hover:text-cyan-200 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-12"
              />
            </div>

            {error ? (
              <div
                role="alert"
                className="rounded-lg border border-red-400/15 bg-red-400/[0.06] px-3.5 py-3 text-xs leading-5 text-red-300"
              >
                {error}
              </div>
            ) : null}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              <LogIn aria-hidden="true" />

              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-white/[0.06]" />

              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-700">
                Authenticated users
              </span>

              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>

            <p className="text-center text-xs leading-5 text-zinc-600">
              Don&apos;t have an account?{' '}
              <Link
                href="/auth/sign-up"
                className="font-medium text-zinc-400 underline decoration-zinc-700 underline-offset-4 transition-colors hover:text-cyan-200 hover:decoration-cyan-300/50"
              >
                Sign up
              </Link>
            </p>
          </form>

          <div className="mt-8 border-t border-white/[0.07] pt-6">
            <div className="flex gap-3">
              <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.035]">
                <ShieldCheck
                  className="size-3.5 text-zinc-500"
                  aria-hidden="true"
                />
              </div>

              <p className="text-xs leading-5 text-zinc-600">
                Authentication establishes identity; application roles and
                database policies determine what that identity can access.
              </p>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-5 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-700">
        Invite gate · authentication · authorization · RLS
      </p>
    </div>
  );
}
