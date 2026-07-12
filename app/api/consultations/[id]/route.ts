import { NextResponse } from 'next/server';
import { AppError } from '@/lib/errors';
import { requireAuthContext } from '@/lib/server/auth';
import { serverReadClient } from '@/lib/supabase/server';
import { consultationUpdateInputSchema } from '@/lib/validation/schemas';
import { validateWithSchema } from '@/lib/validation/validate';
import { withApiHandler } from '@/lib/with-api-handler';
import {
  parseRequestJson,
  createValidationErrorResponse,
  getOwnedConsultationOrThrow,
  assertConsultationCanBeUpdated,
  buildConsultationUpdatePatch,
} from './helpers';

/**
 * PATCH /api/consultations/:id
 * Updates a consultation with the given ID for the authenticated user.
 */
export const PATCH = withApiHandler(
  async (request: Request, context: { params: Promise<{ id: string }> }) => {
    const { userId } = await requireAuthContext({ redirectOnUnauthenticated: false });
    const { id } = await context.params;
    const payload = await parseRequestJson(request);
    const validation = validateWithSchema(consultationUpdateInputSchema, payload);

    if (!validation.success)
      return createValidationErrorResponse(validation.errors, validation.fieldErrors);

    const supabase = await serverReadClient();
    const consultation = await getOwnedConsultationOrThrow(supabase, id, userId);
    assertConsultationCanBeUpdated(consultation);
    const patch = buildConsultationUpdatePatch(validation.data);

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

/**
 * DELETE /api/consultations/:id
 * Cancels a consultation with the given ID for the authenticated user.
 */
export const DELETE = withApiHandler(
  async (_request: Request, context: { params: Promise<{ id: string }> }) => {
    const { userId } = await requireAuthContext({ redirectOnUnauthenticated: false });
    const { id } = await context.params;
    const supabase = await serverReadClient();
    const existingConsultation = await getOwnedConsultationOrThrow(supabase, id, userId);

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
