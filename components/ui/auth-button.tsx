import Link from 'next/link';
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
        <span className="hidden max-w-56 truncate text-muted-foreground sm:inline">
          {user.email}
        </span>

        <LogoutButton />
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button asChild size="sm" variant="outline">
        <Link href="/auth/login">Sign in</Link>
      </Button>

      <Button asChild size="sm">
        <Link href="/auth/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}
