import { NextResponse } from 'next/server';
import { AppError } from '@/lib/errors';
import { serverRequestClient } from '@/lib/supabase/server';
import type { TablesUpdate } from '@/lib/supabase/database.types';
import type {
  ConsultationRecord,
  ConsultationUpdateInput,
} from '@/lib/validation/types';

type ConsultationUpdatePatch = Pick<
  TablesUpdate<'consultations'>,
  'scheduled_for' | 'completed_at'
> & {
  status?: NonNullable<ConsultationUpdateInput['status']>;
};

export const parseRequestJson = async (request: Request): Promise<unknown> => {
  try {
    return await request.json();
  } catch {
    throw new AppError('Request body must be valid JSON', {
      status: 400,
      safeMessage: 'Request body must be valid JSON',
    });
  }
};

export const createValidationErrorResponse = (
  errors: string[],
  fieldErrors: Record<string, string[]>,
) => {
  return NextResponse.json(
    {
      error: errors[0] ?? 'Consultation input is invalid',
      errors,
      fieldErrors,
    },
    { status: 400 },
  );
};

export const getOwnedConsultationOrThrow = async (
  supabase: Awaited<ReturnType<typeof serverRequestClient>>,
  id: string,
  userId: string,
): Promise<ConsultationRecord> => {
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

  return existingConsultation;
};

export const assertConsultationCanBeUpdated = (
  consultation: ConsultationRecord,
) => {
  if (consultation.status === 'cancelled')
    throw new AppError('Cancelled consultations cannot be updated', {
      status: 400,
      safeMessage: 'Cancelled consultations cannot be updated',
    });
};

export const buildConsultationUpdatePatch = (
  input: ConsultationUpdateInput,
): ConsultationUpdatePatch => {
  const patch: ConsultationUpdatePatch = {};
  const { scheduledFor, status } = input;

  if (scheduledFor) patch.scheduled_for = scheduledFor;

  if (!status) return patch;

  patch.status = status;
  patch.completed_at = status === 'completed' ? new Date().toISOString() : null;

  return patch;
};
