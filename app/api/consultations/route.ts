import { validateCreateConsultationInput } from '@/lib/server/consultation-validation';
import { requireAuthContext } from '@/lib/server/auth';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const UNAUTHENTICATED_ERROR = 'Unauthenticated';

export const GET = async () => {
  try {
    const { userId } = await requireAuthContext();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('consultations')
      .select('*')
      .eq('student_user_id', userId)
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

export const POST = async (request: Request) => {
  try {
    const { userId } = await requireAuthContext();
    const payload = await request.json();
    const validation = validateCreateConsultationInput(payload);

    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { firstName, lastName, reason, scheduledFor } = validation.data;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('consultations')
      .insert({
        student_user_id: userId,
        first_name: firstName,
        last_name: lastName,
        reason,
        scheduled_for: scheduledFor,
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to create consultation' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === UNAUTHENTICATED_ERROR) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
};
