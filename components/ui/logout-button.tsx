'use client';

import { LogOut } from 'lucide-react';
import { signOutAction } from '@/app/auth/actions';
import { Button } from '@/components/ui/button';

const LogoutButton = () => (
  <form action={signOutAction} aria-label="Sign out">
    <Button type="submit" size="sm" variant="outline">
      <LogOut aria-hidden="true" />
      Sign out
    </Button>
  </form>
);

LogoutButton.displayName = 'LogoutButton';

export { LogoutButton };
