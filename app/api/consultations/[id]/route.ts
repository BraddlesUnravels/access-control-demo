import { NextResponse } from 'next/server';
import { AppError } from '@/lib/errors';
import { requireAuthContext } from '@/lib/server/auth';
import { serverReadClient } from '@/lib/supabase/server';
import { consultationUpdateInputSchema } from '@/lib/validation/schemas';
import { validateWithSchema } from '@/lib/validation/validate';
import { withApiHandler } from '@/lib/with-api-handler';

type ConsultationUpdatePatch = {
  scheduled_for?: string;
  status?: 'scheduled' | 'completed' | 'cancelled';
  completed_at?: string | null;
  cancelled_at?: string | null;
};

export const PATCH = withApiHandler(
  async (request: Request, context: { params: Promise<{ id: string }> }) => {
    const { userId } = await requireAuthContext({ redirectOnUnauthenticated: false });
    const { id } = await context.params;
    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      throw new AppError('Request body must be valid JSON', {
        status: 400,
        safeMessage: 'Request body must be valid JSON',
      });
    }
    const validation = validateWithSchema(consultationUpdateInputSchema, payload);

    if (!validation.success)
      return NextResponse.json(
        {
          error: validation.errors[0] ?? 'Consultation input is invalid',
          errors: validation.errors,
          fieldErrors: validation.fieldErrors,
        },
        { status: 400 },
      );

    const supabase = await serverReadClient();
    const { data: existingConsultation, error: existingError } = await supabase
      .from('consultations')
      .select('*')
      .eq('id', id)
      .eq('student_user_id', userId)
      .maybeSingle();

    if (existingError)
      throw new AppError('Failed to read consultation', {
        status: 500,
        safeMessage: 'Failed to read consultation',
        meta: { id, userId },
      });

    if (!existingConsultation)
      throw new AppError('Consultation was not found', {
        status: 404,
        safeMessage: 'Consultation was not found',
      });

    if (existingConsultation.status === 'cancelled')
      throw new AppError('Cancelled consultations cannot be updated', {
        status: 400,
        safeMessage: 'Cancelled consultations cannot be updated',
      });

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

    if (error)
      throw new AppError('Failed to update consultation', {
        status: 500,
        safeMessage: 'Failed to update consultation',
        meta: { id, userId },
      });

    return NextResponse.json({ data }, { status: 200 });
  },
);

export const DELETE = withApiHandler(
  async (_request: Request, context: { params: Promise<{ id: string }> }) => {
    const { userId } = await requireAuthContext({ redirectOnUnauthenticated: false });
    const { id } = await context.params;
    const supabase = await serverReadClient();
    const { data: existingConsultation, error: existingError } = await supabase
      .from('consultations')
      .select('*')
      .eq('id', id)
      .eq('student_user_id', userId)
      .maybeSingle();

    if (existingError)
      throw new AppError('Failed to read consultation', {
        status: 500,
        safeMessage: 'Failed to read consultation',
        meta: { id, userId },
      });

    if (!existingConsultation)
      throw new AppError('Consultation was not found', {
        status: 404,
        safeMessage: 'Consultation was not found',
      });

    if (existingConsultation.status === 'cancelled')
      return NextResponse.json({ data: existingConsultation }, { status: 200 });

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

    if (error)
      throw new AppError('Failed to cancel consultation', {
        status: 500,
        safeMessage: 'Failed to cancel consultation',
        meta: { id, userId },
      });

    return NextResponse.json({ data }, { status: 200 });
  },
);
