'use client';

import { CalendarX2 } from 'lucide-react';

import type { ConsultationRecord } from '@/lib/validation/types';
import { ConsultationItem } from './consultation-item';

type ConsultationListProps = {
  consultations: ConsultationRecord[];
  onCancel: (consultationId: string) => Promise<void>;
  onReschedule: (consultationId: string, scheduledFor: string) => Promise<void>;
  onToggleCompleted: (consultation: ConsultationRecord) => Promise<void>;
};

export const ConsultationList = ({
  consultations,
  onCancel,
  onReschedule,
  onToggleCompleted,
}: ConsultationListProps) => {
  if (consultations.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-10 text-center">
        <div className="mb-3 flex size-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03]">
          <CalendarX2
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
        </div>

        <p className="text-sm font-medium">No consultations yet</p>

        <p className="mt-1 text-xs text-muted-foreground">
          Create your first consultation using the form above.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {consultations.map((consultation) => (
        <ConsultationItem
          key={`${consultation.id}:${consultation.scheduled_for}`}
          consultation={consultation}
          onCancel={onCancel}
          onReschedule={onReschedule}
          onToggleCompleted={onToggleCompleted}
        />
      ))}
    </div>
  );
};
