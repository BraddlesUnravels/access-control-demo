'use client';

import { useState } from 'react';
import useSWR from 'swr';

import {
  cancelStudentConsultation,
  createStudentConsultation,
  getStudentConsultations,
  STUDENT_CONSULTATIONS_API_PATH,
  updateStudentConsultation,
} from '@/lib/consultations/api';
import type {
  ConsultationRecord,
  CreateConsultationForm,
} from '@/lib/validation/types';

const toDatetimeLocalValue = (isoString: string) => {
  const date = new Date(isoString);
  const timezoneOffsetMs = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
};

const toIsoDateString = (datetimeLocal: string) => {
  return new Date(datetimeLocal).toISOString();
};

const getErrorMessage = (error: unknown, fallbackMessage: string) => {
  return error instanceof Error ? error.message : fallbackMessage;
};

export const useStudentActions = () => {
  const [actionError, setActionError] = useState<string | undefined>();
  const [actionInProgressById, setActionInProgressById] = useState<
    Record<string, boolean>
  >({});
  const [pendingRescheduleById, setPendingRescheduleById] = useState<
    Record<string, string>
  >({});

  const {
    data: consultations = [],
    error: loadError,
    isLoading: loading,
    mutate: mutateConsultations,
  } = useSWR(STUDENT_CONSULTATIONS_API_PATH, getStudentConsultations);

  const loadErrorMessage = loadError
    ? getErrorMessage(loadError, 'Failed to load consultations')
    : undefined;

  const error = actionError ?? loadErrorMessage;

  const revalidateConsultations = async () => {
    try {
      await mutateConsultations();
      setPendingRescheduleById({});
    } catch {
      // SWR retains the failed revalidation as query error state.
    }
  };

  const setActionLoading = (consultationId: string, loadingState: boolean) => {
    setActionInProgressById((state) => ({
      ...state,
      [consultationId]: loadingState,
    }));
  };

  const setRescheduleValue = (consultationId: string, value: string) => {
    setPendingRescheduleById((state) => ({
      ...state,
      [consultationId]: value,
    }));
  };

  const getRescheduleValue = (consultation: ConsultationRecord) => {
    return (
      pendingRescheduleById[consultation.id] ??
      toDatetimeLocalValue(consultation.scheduled_for)
    );
  };

  const createConsultation = async (createForm: CreateConsultationForm) => {
    setActionError(undefined);

    try {
      await createStudentConsultation({
        firstName: createForm.firstName,
        lastName: createForm.lastName,
        reason: createForm.reason,
        scheduledFor: toIsoDateString(createForm.scheduledFor),
      });

      await revalidateConsultations();
    } catch (createError) {
      const message = getErrorMessage(
        createError,
        'Failed to create consultation',
      );

      setActionError(message);
      throw new Error(message);
    }
  };

  const toggleCompleted = async (consultation: ConsultationRecord) => {
    setActionLoading(consultation.id, true);
    setActionError(undefined);

    try {
      const nextStatus =
        consultation.status === 'completed' ? 'scheduled' : 'completed';

      await updateStudentConsultation(
        consultation.id,
        { status: nextStatus },
        'Failed to update consultation status',
      );

      await revalidateConsultations();
    } catch (updateError) {
      const message = getErrorMessage(
        updateError,
        'Failed to update consultation status',
      );

      setActionError(message);
    } finally {
      setActionLoading(consultation.id, false);
    }
  };

  const reschedule = async (consultation: ConsultationRecord) => {
    const datetimeLocal = getRescheduleValue(consultation);

    if (!datetimeLocal) {
      setActionError('Scheduled time is required');
      return;
    }

    setActionLoading(consultation.id, true);
    setActionError(undefined);

    try {
      await updateStudentConsultation(
        consultation.id,
        {
          scheduledFor: toIsoDateString(datetimeLocal),
        },
        'Failed to reschedule consultation',
      );

      await revalidateConsultations();
    } catch (rescheduleError) {
      const message = getErrorMessage(
        rescheduleError,
        'Failed to reschedule consultation',
      );

      setActionError(message);
    } finally {
      setActionLoading(consultation.id, false);
    }
  };

  const cancelConsultation = async (consultation: ConsultationRecord) => {
    setActionLoading(consultation.id, true);
    setActionError(undefined);

    try {
      await cancelStudentConsultation(consultation.id);

      await revalidateConsultations();
    } catch (cancelError) {
      const message = getErrorMessage(
        cancelError,
        'Failed to cancel consultation',
      );

      setActionError(message);
    } finally {
      setActionLoading(consultation.id, false);
    }
  };

  return {
    consultations,
    loading,
    error,
    actionInProgressById,
    getRescheduleValue,
    setRescheduleValue,
    createConsultation,
    toggleCompleted,
    reschedule,
    cancelConsultation,
  };
};
