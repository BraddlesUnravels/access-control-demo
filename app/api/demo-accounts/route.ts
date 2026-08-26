// app/api/demo-accounts/route.ts

import { connection, NextResponse } from 'next/server';
import { DEMO_ACCOUNTS } from '@/lib/demo-accounts';
import { DEMO_ACCOUNT_PASSWORDS } from '@/lib/demo-account-passwords';

export const GET = async () => {
  // Prevent this response from being prerendered during the build.
  await connection();

  const accounts = DEMO_ACCOUNTS.map((account) => ({
    ...account,
    password: DEMO_ACCOUNT_PASSWORDS[account.id],
  }));

  return NextResponse.json(
    { accounts },
    {
      headers: {
        'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
      },
    },
  );
};
