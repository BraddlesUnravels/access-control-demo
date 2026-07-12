'use client';

import { useEffect, useState } from 'react';
import { getApiErrorMessage, readJsonResponse } from '@/lib/api-response';
import type { ConsultationRecord, CreateConsultationForm } from '@/lib/validation/types';

const toDatetimeLocalValue = (isoString: string) => {
  const date = new Date(isoString);
  const timezoneOffsetMs = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
};

const toIsoDateString = (datetimeLocal: string) => {
  return new Date(datetimeLocal).toISOString();
};

export const useStudentActions = () => {
  const [consultations, setConsultations] = useState<ConsultationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [actionInProgressById, setActionInProgressById] = useState<Record<string, boolean>>({});
  const [pendingRescheduleById, setPendingRescheduleById] = useState<Record<string, string>>({});

  const loadConsultations = async (options?: { showLoading?: boolean }) => {
    const showLoading = options?.showLoading ?? true;

    if (showLoading) {
      setLoading(true);
    }
    setError(undefined);

    try {
      const response = await fetch('/api/consultations', { method: 'GET' });
      const payload = await readJsonResponse<{ data?: ConsultationRecord[]; error?: string }>(
        response,
      );

      if (!response.ok) throw new Error(getApiErrorMessage(payload, 'Failed to load consultations'));
      if (!payload?.data) throw new Error('Failed to load consultations');

      setConsultations(payload.data);
      setPendingRescheduleById({});
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : 'Failed to load consultations';
      setError(message);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadConsultations();
  }, []);

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
    return pendingRescheduleById[consultation.id] ?? toDatetimeLocalValue(consultation.scheduled_for);
  };

  const createConsultation = async (createForm: CreateConsultationForm) => {
    setError(undefined);

    try {
      const response = await fetch('/api/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: createForm.firstName,
          lastName: createForm.lastName,
          reason: createForm.reason,
          scheduledFor: toIsoDateString(createForm.scheduledFor),
        }),
      });
      const payload = await readJsonResponse<{ error?: string }>(response);

      if (!response.ok) throw new Error(getApiErrorMessage(payload, 'Failed to create consultation'));

      await loadConsultations({ showLoading: false });
    } catch (createError) {
      const message =
        createError instanceof Error ? createError.message : 'Failed to create consultation';
      setError(message);
      throw new Error(message);
    }
  };

  const toggleCompleted = async (consultation: ConsultationRecord) => {
    setActionLoading(consultation.id, true);
    setError(undefined);

    try {
      const nextStatus = consultation.status === 'completed' ? 'scheduled' : 'completed';
      const response = await fetch(`/api/consultations/${consultation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = await readJsonResponse<{ error?: string }>(response);

      if (!response.ok)
        throw new Error(getApiErrorMessage(payload, 'Failed to update consultation status'));

      await loadConsultations({ showLoading: false });
    } catch (updateError) {
      const message =
        updateError instanceof Error ? updateError.message : 'Failed to update consultation status';
      setError(message);
    } finally {
      setActionLoading(consultation.id, false);
    }
  };

  const reschedule = async (consultation: ConsultationRecord) => {
    const datetimeLocal = getRescheduleValue(consultation);

    if (!datetimeLocal) {
      setError('Scheduled time is required');
      return;
    }

    setActionLoading(consultation.id, true);
    setError(undefined);

    try {
      const response = await fetch(`/api/consultations/${consultation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledFor: toIsoDateString(datetimeLocal) }),
      });
      const payload = await readJsonResponse<{ error?: string }>(response);

      if (!response.ok) throw new Error(getApiErrorMessage(payload, 'Failed to reschedule consultation'));

      await loadConsultations({ showLoading: false });
    } catch (rescheduleError) {
      const message =
        rescheduleError instanceof Error ? rescheduleError.message : 'Failed to reschedule consultation';
      setError(message);
    } finally {
      setActionLoading(consultation.id, false);
    }
  };

  const cancelConsultation = async (consultation: ConsultationRecord) => {
    setActionLoading(consultation.id, true);
    setError(undefined);

    try {
      const response = await fetch(`/api/consultations/${consultation.id}`, {
        method: 'DELETE',
      });
      const payload = await readJsonResponse<{ error?: string }>(response);

      if (!response.ok) throw new Error(getApiErrorMessage(payload, 'Failed to cancel consultation'));

      await loadConsultations({ showLoading: false });
    } catch (cancelError) {
      const message =
        cancelError instanceof Error ? cancelError.message : 'Failed to cancel consultation';
      setError(message);
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
