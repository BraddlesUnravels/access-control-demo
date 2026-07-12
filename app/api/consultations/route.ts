import { NextResponse } from 'next/server';
import { AppError } from '@/lib/errors';
import { requireAuthContext } from '@/lib/server/auth';
import { serverReadClient } from '@/lib/supabase/server';
import { consultationCreateInputSchema } from '@/lib/validation/schemas';
import { validateWithSchema } from '@/lib/validation/validate';
import { withApiHandler } from '@/lib/with-api-handler';

/**
 * GET /api/consultations
 * Retrieves all consultations for the authenticated user.
 */
export const GET = withApiHandler(async () => {
  const { userId } = await requireAuthContext({ redirectOnUnauthenticated: false });
  const supabase = await serverReadClient();
  const { data, error } = await supabase
    .from('consultations')
    .select('*')
    .eq('student_user_id', userId)
    .order('scheduled_for', { ascending: true });

  if (error)
    throw new AppError('Failed to load consultations', {
      status: 500,
      safeMessage: 'Failed to load consultations',
      meta: { userId },
    });

  return NextResponse.json({ data }, { status: 200 });
});

/**
 * POST /api/consultations
 * Creates a new consultation for the authenticated user.
 */
export const POST = withApiHandler(async (request: Request) => {
  const { userId } = await requireAuthContext({ redirectOnUnauthenticated: false });
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    throw new AppError('Request body must be valid JSON', {
      status: 400,
      safeMessage: 'Request body must be valid JSON',
    });
  }
  const validation = validateWithSchema(consultationCreateInputSchema, payload);

  if (!validation.success)
    return NextResponse.json(
      {
        error: validation.errors[0] ?? 'Consultation input is invalid',
        errors: validation.errors,
        fieldErrors: validation.fieldErrors,
      },
      { status: 400 },
    );

  const { firstName, lastName, reason, scheduledFor } = validation.data;
  const supabase = await serverReadClient();
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

  if (error)
    throw new AppError('Failed to create consultation', {
      status: 500,
      safeMessage: 'Failed to create consultation',
      meta: { userId },
    });

  return NextResponse.json({ data }, { status: 201 });
});
