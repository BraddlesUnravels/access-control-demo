'use client';

import { ConsultationSummaryCard } from '@/components/consultations/consultation-summary-card';
import useSWR from 'swr';
import {
  ADMIN_CONSULTATIONS_API_PATH,
  getAdminConsultations,
} from '@/lib/consultations/api';
import { AdminFallback } from './admin-loading-error-fallback';

export const ConsultationListAdmin = () => {
  const {
    data: consultations = [],
    error,
    isLoading: loading,
  } = useSWR(ADMIN_CONSULTATIONS_API_PATH, getAdminConsultations);

  if (consultations.length === 0 || loading || error)
    return <AdminFallback loading={loading} error={error} />;

  return (
    <div className="flex flex-col gap-4">
      {consultations.map((consultation) => (
        <ConsultationSummaryCard
          key={`${consultation.id}:${consultation.scheduled_for}`}
          consultation={consultation}
          showStudentUserId
        />
      ))}
    </div>
  );
};
