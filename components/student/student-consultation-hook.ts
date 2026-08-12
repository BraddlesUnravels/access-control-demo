'use client';

import useSWR from 'swr';
import {
  getStudentConsultations,
  STUDENT_CONSULTATIONS_API_PATH,
} from '@/lib/consultations/api';

export const useStudentConsultations = () => {
  const {
    data: consultations = [],
    error: loadError,
    isLoading: loading,
  } = useSWR(STUDENT_CONSULTATIONS_API_PATH, getStudentConsultations);

  const error =
    loadError instanceof Error
      ? loadError.message
      : loadError
        ? 'Failed to load consultations'
        : undefined;

  return {
    consultations,
    loading,
    error,
  };
};
