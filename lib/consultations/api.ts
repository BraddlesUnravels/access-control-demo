import * as v from 'valibot';
import { getApiErrorMessage, readJsonResponse } from '@/lib/api-response';
import {
  consultationListResponseSchema,
  consultationResponseSchema,
} from '@/lib/consultations/schemas';
import type {
  ConsultationCreateInput,
  ConsultationRecord,
  ConsultationUpdateInput,
} from '@/lib/validation/types';

export const STUDENT_CONSULTATIONS_API_PATH = '/api/consultations';
export const ADMIN_CONSULTATIONS_API_PATH = '/api/admin/consultations';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
} as const;

const requestJson = async <
  TSchema extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>,
>(
  path: string,
  schema: TSchema,
  fallbackMessage: string,
  init?: RequestInit,
): Promise<v.InferOutput<TSchema>> => {
  const response = await fetch(path, init);
  const payload = await readJsonResponse(response);

  if (!response.ok)
    throw new Error(getApiErrorMessage(payload, fallbackMessage));

  const result = v.safeParse(schema, payload);

  if (!result.success) throw new Error(fallbackMessage);

  return result.output;
};

export const getStudentConsultations = async (): Promise<
  ConsultationRecord[]
> => {
  const payload = await requestJson(
    STUDENT_CONSULTATIONS_API_PATH,
    consultationListResponseSchema,
    'Failed to load consultations',
    { method: 'GET' },
  );

  const consultations: ConsultationRecord[] = payload.data;

  return consultations;
};

export const getAdminConsultations = async (): Promise<
  ConsultationRecord[]
> => {
  const payload = await requestJson(
    ADMIN_CONSULTATIONS_API_PATH,
    consultationListResponseSchema,
    'Failed to load administrator consultations',
    { method: 'GET' },
  );

  const consultations: ConsultationRecord[] = payload.data;

  return consultations;
};

export const createStudentConsultation = async (
  input: ConsultationCreateInput,
): Promise<ConsultationRecord> => {
  const payload = await requestJson(
    STUDENT_CONSULTATIONS_API_PATH,
    consultationResponseSchema,
    'Failed to create consultation',
    {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(input),
    },
  );

  const consultation: ConsultationRecord = payload.data;

  return consultation;
};

export const updateStudentConsultation = async (
  consultationId: string,
  input: ConsultationUpdateInput,
  fallbackMessage = 'Failed to update consultation',
): Promise<ConsultationRecord> => {
  const payload = await requestJson(
    `${STUDENT_CONSULTATIONS_API_PATH}/${consultationId}`,
    consultationResponseSchema,
    fallbackMessage,
    {
      method: 'PATCH',
      headers: JSON_HEADERS,
      body: JSON.stringify(input),
    },
  );

  const consultation: ConsultationRecord = payload.data;

  return consultation;
};

export const cancelStudentConsultation = async (
  consultationId: string,
): Promise<ConsultationRecord> => {
  const payload = await requestJson(
    `${STUDENT_CONSULTATIONS_API_PATH}/${consultationId}`,
    consultationResponseSchema,
    'Failed to cancel consultation',
    {
      method: 'DELETE',
    },
  );

  const consultation: ConsultationRecord = payload.data;

  return consultation;
};
