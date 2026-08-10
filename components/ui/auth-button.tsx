import Link from 'next/link';
import { LogIn, UserRound } from 'lucide-react';

import { serverRequestClient } from '@/lib/supabase/server';
import { LogoutButton } from './logout-button';
import { Button } from './button';

export async function AuthButton() {
  const supabase = await serverRequestClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 text-muted-foreground sm:flex">
          <UserRound className="size-3.5" aria-hidden="true" />
          <span className="max-w-56 truncate text-xs">{user.email}</span>
        </div>

        <LogoutButton />
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button asChild size="sm" variant="outline">
        <Link href="/auth/login">
          <LogIn aria-hidden="true" />
          Sign in
        </Link>
      </Button>

      <Button asChild size="sm">
        <Link href="/auth/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}
