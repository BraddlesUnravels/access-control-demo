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
    <div id="app-sign-out" className="flex items-center gap-2.5">
      <User2 className="size-3 text-cyan-300" aria-hidden="true" />
      <Typography
        variant="caption"
        className="tracking-[0.12em] text-emerald-300"
      >
        {userEmail}
      </Typography>
      <form action={signOutAction} aria-label="Sign out">
        <Button type="submit" size="sm" variant="outline">
          <LogOut aria-hidden="true" />
          Sign out
        </Button>
      </form>
    </div>
  );
};

SignOutButton.displayName = 'SignOutButton';

export { SignOutButton };
