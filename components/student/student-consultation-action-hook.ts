'use client';

import { useState } from 'react';
import { useSWRConfig } from 'swr';
import {
  cancelStudentConsultation,
  createStudentConsultation,
  STUDENT_CONSULTATIONS_API_PATH,
  updateStudentConsultation,
} from '@/lib/consultations/api';
import type {
  ConsultationRecord,
  CreateConsultationForm,
} from '@/lib/validation/types';

const toIsoDateString = (datetimeLocal: string) => {
  return new Date(datetimeLocal).toISOString();
};

const getErrorMessage = (error: unknown, fallbackMessage: string) => {
  return error instanceof Error ? error.message : fallbackMessage;
};

type StudentAction = () => Promise<unknown>;

type RunStudentActionOptions = {
  rethrow?: boolean;
};

export const useStudentConsultationActions = () => {
  const { mutate } = useSWRConfig();
  const [error, setError] = useState<string | undefined>();

  const revalidateConsultations = async () => {
    try {
      await mutate(STUDENT_CONSULTATIONS_API_PATH);
    } catch {
      // SWR exposes failed revalidation through the consultation query state.
    }
  };

  const runAction = async (
    action: StudentAction,
    fallbackMessage: string,
    options: RunStudentActionOptions = {},
  ) => {
    setError(undefined);

    try {
      await action();
      await revalidateConsultations();
    } catch (actionError) {
      const message = getErrorMessage(actionError, fallbackMessage);

      setError(message);

      if (options.rethrow) {
        throw new Error(message);
      }
    }
  };

  const createConsultation = async (createForm: CreateConsultationForm) => {
    await runAction(
      () =>
        createStudentConsultation({
          firstName: createForm.firstName,
          lastName: createForm.lastName,
          reason: createForm.reason,
          scheduledFor: toIsoDateString(createForm.scheduledFor),
        }),
      'Failed to create consultation',
      { rethrow: true },
    );
  };

  const toggleCompleted = async (consultation: ConsultationRecord) => {
    const nextStatus =
      consultation.status === 'completed' ? 'scheduled' : 'completed';

    await runAction(
      () =>
        updateStudentConsultation(
          consultation.id,
          { status: nextStatus },
          'Failed to update consultation status',
        ),
      'Failed to update consultation status',
    );
  };

  const reschedule = async (consultationId: string, datetimeLocal: string) => {
    if (!datetimeLocal) {
      setError('Scheduled time is required');
      return;
    }

    await runAction(
      () =>
        updateStudentConsultation(
          consultationId,
          {
            scheduledFor: toIsoDateString(datetimeLocal),
          },
          'Failed to reschedule consultation',
        ),
      'Failed to reschedule consultation',
    );
  };

  const cancelConsultation = async (consultationId: string) => {
    await runAction(
      () => cancelStudentConsultation(consultationId),
      'Failed to cancel consultation',
    );
  };

  return {
    error,
    createConsultation,
    toggleCompleted,
    reschedule,
    cancelConsultation,
  };
};
