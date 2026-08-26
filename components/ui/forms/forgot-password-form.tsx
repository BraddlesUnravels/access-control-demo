'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useActionState } from 'react';
import { requestPasswordResetAction } from '@/app/auth/actions';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { Typography } from '../typography';

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  const [state, formAction, isPending] = useActionState(
    requestPasswordResetAction,
    {},
  );

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      {state.success ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Check Your Email</CardTitle>
            <CardDescription>Password reset instructions sent</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              If you registered using your email and password, you will receive
              a password reset email.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Reset Your Password</CardTitle>
            <CardDescription>
              Type in your email and we&apos;ll send you a link to reset your
              password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={formAction}>
              <div className="flex flex-col gap-6">
                <FormField
                  label="Email"
                  htmlFor="email"
                  className="gap-1"
                  labelClassName="font-semibold uppercase tracking-[0.08em] text-zinc-400"
                >
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="example@lms.com"
                    required
                    aria-invalid={state.error ? true : undefined}
                    aria-describedby={state.error ?? undefined}
                  />
                </FormField>
                {state.error && (
                  <Typography as="p" variant="caption" className="text-red-500">
                    {state.error}
                  </Typography>
                )}
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? 'Sending...' : 'Send reset email'}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm">
                Already have an account?{' '}
                <Link
                  href="/auth/login"
                  className="underline underline-offset-4"
                >
                  Login
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
