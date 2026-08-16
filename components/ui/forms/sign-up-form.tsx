'use client';

import { cn } from '@/lib/utils';
import { useActionState } from 'react';
import { signUpAction } from '@/app/auth/actions';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input, PasswordInput } from '@/components/ui/input';
import { FormField } from '../form-field';
import Link from 'next/link';
import { Typography } from '../typography';

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  const [state, formAction, isPending] = useActionState(signUpAction, {});

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">LMS Sign up</CardTitle>
          <CardDescription>Create a new LMS account</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction}>
            <div className="flex flex-col gap-6">
              <FormField label="Email" id="email" htmlFor="email">
                <Input id="email" type="email" required autoComplete="email" />
              </FormField>

              <FormField label="Password" id="password" htmlFor="password">
                <PasswordInput
                  id="password"
                  required
                  autoComplete="new-password"
                />
              </FormField>

              <FormField
                label="Repeat Password"
                id="repeat-password"
                htmlFor="repeat-password"
              >
                <PasswordInput
                  id="repeat-password"
                  required
                  autoComplete="new-password"
                />
              </FormField>

              {state.error && (
                <Typography as="p" variant="caption" className="text-red-500">
                  {state.error}
                </Typography>
              )}
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? 'Creating an account...' : 'Sign up'}
              </Button>
            </div>

            <div className="mt-4 text-center text-sm">
              Already have an account?{' '}
              <Link href="/auth/login" className="underline underline-offset-4">
                Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
