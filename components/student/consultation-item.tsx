'use client';

import { useState } from 'react';
import { CalendarClock, CheckCircle2, XCircle } from 'lucide-react';
import { ConsultationSummaryCard } from '@/components/consultations/consultation-summary-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ConsultationRecord } from '@/lib/validation/types';

const toDatetimeLocalValue = (isoString: string) => {
  const date = new Date(isoString);
  const timezoneOffsetMs = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
};

type ConsultationItemProps = {
  consultation: ConsultationRecord;
  onCancel: (consultationId: string) => Promise<void>;
  onReschedule: (consultationId: string, scheduledFor: string) => Promise<void>;
  onToggleCompleted: (consultation: ConsultationRecord) => Promise<void>;
};

export const ConsultationItem = ({
  consultation,
  onCancel,
  onReschedule,
  onToggleCompleted,
}: ConsultationItemProps) => {
  const [actionInProgress, setActionInProgress] = useState(false);
  const [rescheduleValue, setRescheduleValue] = useState(() =>
    toDatetimeLocalValue(consultation.scheduled_for),
  );

  const runAction = async (action: () => Promise<void>) => {
    setActionInProgress(true);

    try {
      await action();
    } finally {
      setActionInProgress(false);
    }
  };

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
              onChange={(event) => setRescheduleValue(event.target.value)}
            />
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={actionDisabled}
            onClick={() =>
              void runAction(() =>
                onReschedule(consultation.id, rescheduleValue),
              )
            }
          >
            <CalendarClock aria-hidden="true" />
            Reschedule
          </Button>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button
              type="button"
              variant="secondary"
              disabled={completedDisabled}
              onClick={() =>
                void runAction(() => onToggleCompleted(consultation))
              }
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
              onClick={() => void runAction(() => onCancel(consultation.id))}
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
