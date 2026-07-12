import { requireAuthContext } from '@/lib/server/auth';
import { serverClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const UNAUTHENTICATED_ERROR = 'Unauthenticated';

export const GET = async () => {
  try {
    const { role } = await requireAuthContext();

    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await serverClient();
    const { data, error } = await supabase
      .from('consultations')
      .select('*')
      .order('scheduled_for', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Failed to load consultations' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === UNAUTHENTICATED_ERROR) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
};
