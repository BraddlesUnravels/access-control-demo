// app/api/demo-accounts/route.ts

import { connection, NextResponse } from 'next/server';
import { requireAccessGateSession } from '@/lib/access-gate/require-session';
import { DEMO_ACCOUNTS } from '@/lib/demo-accounts';
import { DEMO_ACCOUNT_PASSWORDS } from '@/lib/demo-account-passwords';
import { withApiHandler } from '@/lib/with-api-handler';

export const GET = withApiHandler(async () => {
  // Prevent this response from being prerendered during the build.
  await connection();

  await requireAccessGateSession();

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
});
