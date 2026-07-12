'use client';

import { Button } from '@/components/ui/button';
import { ConsultationSummaryCard } from '@/components/consultations/consultation-summary-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ConsultationRecord } from '@/lib/validation/types';

type ConsultationItemProps = {
  actionInProgress: boolean;
  consultation: ConsultationRecord;
  onCancel: (consultation: ConsultationRecord) => Promise<void>;
  onReschedule: (consultation: ConsultationRecord) => Promise<void>;
  onRescheduleChange: (consultationId: string, value: string) => void;
  onToggleCompleted: (consultation: ConsultationRecord) => Promise<void>;
  rescheduleValue: string;
};

export const ConsultationItem = ({
  actionInProgress,
  consultation,
  onCancel,
  onReschedule,
  onRescheduleChange,
  onToggleCompleted,
  rescheduleValue,
}: ConsultationItemProps) => {
  const actionDisabled =
    consultation.status === 'cancelled' || consultation.status === 'completed' || actionInProgress;
  const completedDisabled = consultation.status === 'cancelled' || actionInProgress;

  return (
    <ConsultationSummaryCard
      consultation={consultation}
      actions={
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
          <div className="grid gap-2">
            <Label htmlFor={`reschedule-${consultation.id}`}>Reschedule</Label>
            <Input
              id={`reschedule-${consultation.id}`}
              type="datetime-local"
              value={rescheduleValue}
              disabled={actionDisabled}
              onChange={(event) => onRescheduleChange(consultation.id, event.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={actionDisabled}
            onClick={() => void onReschedule(consultation)}
          >
            Reschedule
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={completedDisabled}
              onClick={() => void onToggleCompleted(consultation)}
            >
              {consultation.status === 'completed' ? 'Mark incomplete' : 'Mark complete'}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={actionDisabled}
              onClick={() => void onCancel(consultation)}
            >
              Cancel
            </Button>
          </div>
        </div>
      }
    />
  );
};
