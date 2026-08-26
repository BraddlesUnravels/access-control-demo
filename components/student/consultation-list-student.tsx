'use client';

import type { ConsultationRecord } from '@/lib/validation/types';
import { ConsultationItem } from '../consultations/consultation-item';
import { useStudentConsultations } from './student-consultation-hook';
import { useStudentConsultationActions } from './student-consultation-action-hook';
import { StudentFallback } from './student-loading-error-fallback';
import { FormMessage } from '../ui/form-message';

export const ConsultationListStudent = () => {
  const {
    consultations,
    loading,
    error: loadError,
  } = useStudentConsultations();
  const {
    cancelConsultation,
    reschedule,
    toggleCompleted,
    error: actionError,
  } = useStudentConsultationActions();
  const error = loadError ?? actionError;

  if (consultations.length === 0 || loading)
    return <StudentFallback loading={loading} error={error} />;

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <FormMessage id="form-error" variant="error">
          {error}
        </FormMessage>
      )}
      {consultations.map((consultation: ConsultationRecord, i) => (
        <ConsultationItem
          key={consultation.id}
          consultation={consultation}
          onCancel={cancelConsultation}
          onReschedule={reschedule}
          onToggleCompleted={toggleCompleted}
        />
      ))}
    </div>
  );
};
