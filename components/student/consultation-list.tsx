'use client';

import type { ConsultationRecord } from '@/lib/validation/types';
import { ConsultationItem } from './consultation-item';

type ConsultationListProps = {
  actionInProgressById: Record<string, boolean>;
  consultations: ConsultationRecord[];
  getRescheduleValue: (consultation: ConsultationRecord) => string;
  onCancel: (consultation: ConsultationRecord) => Promise<void>;
  onReschedule: (consultation: ConsultationRecord) => Promise<void>;
  onRescheduleChange: (consultationId: string, value: string) => void;
  onToggleCompleted: (consultation: ConsultationRecord) => Promise<void>;
};

export const ConsultationList = ({
  actionInProgressById,
  consultations,
  getRescheduleValue,
  onCancel,
  onReschedule,
  onRescheduleChange,
  onToggleCompleted,
}: ConsultationListProps) => {
  if (consultations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No consultations yet.</p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {consultations.map((consultation) => (
        <ConsultationItem
          key={consultation.id}
          actionInProgress={actionInProgressById[consultation.id] ?? false}
          consultation={consultation}
          onCancel={onCancel}
          onReschedule={onReschedule}
          onRescheduleChange={onRescheduleChange}
          onToggleCompleted={onToggleCompleted}
          rescheduleValue={getRescheduleValue(consultation)}
        />
      ))}
    </div>
  );
};
