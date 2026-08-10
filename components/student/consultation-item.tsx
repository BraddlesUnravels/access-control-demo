'use client';

import { CalendarClock, CheckCircle2, XCircle } from 'lucide-react';

import { ConsultationSummaryCard } from '@/components/consultations/consultation-summary-card';
import { Button } from '@/components/ui/button';
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
    consultation.status === 'cancelled' ||
    consultation.status === 'completed' ||
    actionInProgress;

  const completedDisabled =
    consultation.status === 'cancelled' || actionInProgress;

  return (
    <ConsultationSummaryCard
      consultation={consultation}
      actions={
        <div className="grid gap-3 border-t border-white/[0.06] pt-4 lg:grid-cols-[minmax(220px,1fr)_auto_auto] lg:items-end">
          <div className="grid gap-2">
            <Label htmlFor={`reschedule-${consultation.id}`}>Reschedule</Label>

            <Input
              id={`reschedule-${consultation.id}`}
              type="datetime-local"
              value={rescheduleValue}
              disabled={actionDisabled}
              onChange={(event) =>
                onRescheduleChange(consultation.id, event.target.value)
              }
            />
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={actionDisabled}
            onClick={() => void onReschedule(consultation)}
          >
            <CalendarClock aria-hidden="true" />
            Reschedule
          </Button>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button
              type="button"
              variant="secondary"
              disabled={completedDisabled}
              onClick={() => void onToggleCompleted(consultation)}
            >
              <CheckCircle2 aria-hidden="true" />

              {consultation.status === 'completed'
                ? 'Mark incomplete'
                : 'Mark complete'}
            </Button>

            <Button
              type="button"
              variant="destructive"
              disabled={actionDisabled}
              onClick={() => void onCancel(consultation)}
            >
              <XCircle aria-hidden="true" />
              Cancel
            </Button>
          </div>
        </div>
      }
    />
  );
};
