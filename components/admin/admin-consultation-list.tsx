'use client';

import { ConsultationSummaryCard } from '@/components/consultations/consultation-summary-card';
import useSWR from 'swr';
import {
  ADMIN_CONSULTATIONS_API_PATH,
  getAdminConsultations,
} from '@/lib/consultations/api';
import { AdminFallback } from './admin-loading-error-fallback';

const getLoadError = (error: unknown): string | undefined => {
  if (error instanceof Error) return error.message;
  if (error) return 'Failed to load student consultations';
  return;
};

export const ConsultationListAdmin = () => {
  const {
    data: consultations = [],
    error: loadError,
    isLoading: loading,
  } = useSWR(ADMIN_CONSULTATIONS_API_PATH, getAdminConsultations);
  const error = getLoadError(loadError);

  if (consultations.length === 0 || loading || error)
    return <AdminFallback loading={loading} error={error} />;

  return (
    <div className="flex flex-col gap-4">
      {consultations.map((consultation, i) => (
        <ConsultationSummaryCard
          key={`${consultation.id}:${i}`}
          consultation={consultation}
          showStudentUserId
        />
      ))}
    </div>
  );
};
