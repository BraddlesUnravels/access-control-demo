import { LogOut, User2 } from 'lucide-react';
import { signOutAction } from '@/app/auth/actions';
import { Button } from './button';
import { Typography } from './typography';
import { serverRequestClient } from '@/lib/supabase/server';

const SignOutButton = async () => {
  const supabase = await serverRequestClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userEmail = user?.email ?? 'Unknown user';
  return (
    <div id="app-sign-out" className="flex min-w-0 items-center gap-2.5">
      <User2
        className="hidden size-3 shrink-0 text-cyan-300 sm:block"
        aria-hidden="true"
      />
      <Typography
        as="span"
        variant="caption"
        className="hidden max-w-48 truncate tracking-[0.12em] text-emerald-300 md:block lg:max-w-64"
      >
        {userEmail}
      </Typography>

      <form action={signOutAction} aria-label="Sign out" className="shrink-0">
        <Button type="submit" size="sm" variant="outline" aria-label="Sign out">
          <LogOut aria-hidden="true" />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </form>
    </div>
  );
};

SignOutButton.displayName = 'SignOutButton';

export { SignOutButton };
