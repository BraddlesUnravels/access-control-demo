'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { browserClient } from '@/lib/supabase/client';

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    const supabase = browserClient();

    await supabase.auth.signOut();

    router.replace('/auth/login');
    router.refresh();
  };

  return (
    <Button type="button" size="sm" variant="outline" onClick={logout}>
      <LogOut aria-hidden="true" />
      Sign out
    </Button>
  );
}
