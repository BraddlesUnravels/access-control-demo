'use client';

import { useActionState } from 'react';
import { updatePasswordAction } from '@/app/auth/actions';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PasswordInput } from '@/components/ui/input';

import { FormField } from '@/components/ui/form-field';
import { Typography } from '@/components/ui/typography';

export function UpdatePasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  const [state, formAction] = useActionState(updatePasswordAction, {});

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Reset Your Password</CardTitle>

          <CardDescription>
            Please enter your new password below.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form action={formAction}>
            <FormField
              id="password"
              label="New Password"
              htmlFor="new-password"
              className="gap-1"
              labelClassName="font-semibold uppercase tracking-[0.08em] text-zinc-400"
            >
              <PasswordInput
                id="password"
                name="new-password"
                autoComplete="new-password"
                required
                aria-invalid={Boolean(state.error)}
                aria-describedby={
                  state.error ? 'update-password-error' : undefined
                }
                className="h-12 font-mono text-sm"
              />
            </FormField>

            <FormField
              id="confirm-password"
              label="Confirm Password"
              htmlFor="consfirm-password"
              className="gap-1"
              labelClassName="font-semibold uppercase tracking-[0.08em] text-zinc-400"
            >
              <PasswordInput
                id="confirm-password"
                name="confirm-password"
                autoComplete="new-password"
                required
                aria-invalid={Boolean(state.error)}
                aria-describedby={
                  state.error ? 'update-password-error' : undefined
                }
                className="h-12 font-mono text-sm"
              />
            </FormField>

            {state.error && (
              <Typography
                id="update-password-error"
                as="p"
                variant="caption"
                className="text-red-500"
              >
                {state.error}
              </Typography>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
