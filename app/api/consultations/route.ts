import { requireAuthContext } from '@/lib/server/auth';
import { serverClient } from '@/lib/supabase/server';
import { consultationCreateInputSchema } from '@/lib/validation/schemas';
import { validateWithSchema } from '@/lib/validation/validate';
import { NextResponse } from 'next/server';

const UNAUTHENTICATED_ERROR = 'Unauthenticated';

/**
 * GET /api/consultations
 * Retrieves all consultations for the authenticated user.
 */
export const GET = async () => {
  try {
    const { userId } = await requireAuthContext();
    const supabase = await serverClient();

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

/**
 * POST /api/consultations
 * Creates a new consultation for the authenticated user.
 */
export const POST = async (request: Request) => {
  try {
    const { userId } = await requireAuthContext();
    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
    }
    const validation = validateWithSchema(consultationCreateInputSchema, payload);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: validation.errors[0] ?? 'Consultation input is invalid',
          errors: validation.errors,
          fieldErrors: validation.fieldErrors,
        },
        { status: 400 },
      );
    }

    const { firstName, lastName, reason, scheduledFor } = validation.data;
    const supabase = await serverClient();

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
