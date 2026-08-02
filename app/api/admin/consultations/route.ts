import { NextResponse } from 'next/server';
import { AppError } from '@/lib/errors';
import { assertRole, requireAuthContext } from '@/lib/server/auth';
import { serverReadClient } from '@/lib/supabase/server';
import { withApiHandler } from '@/lib/with-api-handler';

export const GET = withApiHandler(async () => {
  const { role } = await requireAuthContext({ redirectOnUnauthenticated: false });

  assertRole(role, 'admin');

  const supabase = await serverReadClient();
  const { data, error } = await supabase
    .from('consultations')
    .select('*')
    .order('scheduled_for', { ascending: true });

  if (error)
    throw new AppError('Failed to load consultations', {
      status: 500,
      safeMessage: 'Failed to load consultations',
    });

  return NextResponse.json({ data }, { status: 200 });
});
