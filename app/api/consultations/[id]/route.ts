import { validateUpdateConsultationInput } from '@/lib/server/consultation-validation';
import { requireAuthContext } from '@/lib/server/auth';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

type ConsultationUpdatePatch = {
  scheduled_for?: string;
  status?: 'scheduled' | 'completed' | 'cancelled';
  completed_at?: string | null;
  cancelled_at?: string | null;
};

const UNAUTHENTICATED_ERROR = 'Unauthenticated';

export const PATCH = async (request: Request, context: { params: Promise<{ id: string }> }) => {
  try {
    const { userId } = await requireAuthContext();
    const { id } = await context.params;
    const payload = await request.json();
    const validation = validateUpdateConsultationInput(payload);

    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: existingConsultation, error: existingError } = await supabase
      .from('consultations')
      .select('*')
      .eq('id', id)
      .eq('student_user_id', userId)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: 'Failed to read consultation' }, { status: 500 });
    }

    if (!existingConsultation) {
      return NextResponse.json({ error: 'Consultation was not found' }, { status: 404 });
    }

    if (existingConsultation.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cancelled consultations cannot be updated' },
        { status: 400 },
      );
    }

    const patch: ConsultationUpdatePatch = {};
    const { scheduledFor, status } = validation.data;

    if (scheduledFor) patch.scheduled_for = scheduledFor;
    if (status) {
      patch.status = status;
      patch.completed_at = status === 'completed' ? new Date().toISOString() : null;
    }

    const { data, error } = await supabase
      .from('consultations')
      .update(patch)
      .eq('id', id)
      .eq('student_user_id', userId)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update consultation' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === UNAUTHENTICATED_ERROR) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
};

export const DELETE = async (_request: Request, context: { params: Promise<{ id: string }> }) => {
  try {
    const { userId } = await requireAuthContext();
    const { id } = await context.params;
    const supabase = await createClient();

    const { data: existingConsultation, error: existingError } = await supabase
      .from('consultations')
      .select('*')
      .eq('id', id)
      .eq('student_user_id', userId)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: 'Failed to read consultation' }, { status: 500 });
    }

    if (!existingConsultation) {
      return NextResponse.json({ error: 'Consultation was not found' }, { status: 404 });
    }

    if (existingConsultation.status === 'cancelled') {
      return NextResponse.json({ data: existingConsultation }, { status: 200 });
    }

    const { data, error } = await supabase
      .from('consultations')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('student_user_id', userId)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to cancel consultation' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === UNAUTHENTICATED_ERROR) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 });
  }
};
