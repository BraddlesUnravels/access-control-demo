'use client';

import { useState } from 'react';
import { CalendarClock, CheckCircle2, XCircle, Circle } from 'lucide-react';
import { ConsultationSummaryCard } from '@/components/consultations/consultation-summary-card';
import { Button } from '@/components/ui/button';
import { DateTimeInput } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ConsultationRecord } from '@/lib/validation/types';

const toDatetimeLocalValue = (isoString: string) => {
  const date = new Date(isoString);
  const timezoneOffsetMs = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
};

type ConsultationItemProps = {
  consultation: ConsultationRecord;
  onCancel?: (consultationId: string) => Promise<void>;
  onReschedule?: (
    consultationId: string,
    scheduledFor: string,
  ) => Promise<void>;
  onToggleCompleted?: (consultation: ConsultationRecord) => Promise<void>;
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

  const showActions = onCancel && onReschedule && onToggleCompleted;

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
        showActions && (
          <div className="grid gap-3 border-t border-white/6 pt-4 lg:grid-cols-3">
            <div className="grid gap-2 xl:col-span-full 2xl:col-span-1">
              <Label htmlFor={`reschedule-${consultation.id}`}>
                Reschedule
              </Label>

              <DateTimeInput
                id={`reschedule-${consultation.id}`}
                type="datetime-local"
                value={rescheduleValue}
                disabled={actionDisabled}
                onChange={(event) => setRescheduleValue(event.target.value)}
              />
            </div>
            <div className="flex w-full gap-1 flex-col md:flex-row md:justify-between lg:items-end lg:col-span-2 xl:col-span-full 2xl:col-span-2">
              <Button
                type="button"
                variant="outline"
                disabled={actionDisabled}
                onClick={() =>
                  onReschedule &&
                  void runAction(() =>
                    onReschedule(consultation.id, rescheduleValue),
                  )
                }
                className="col-span-1"
              >
                <CalendarClock aria-hidden="true" />
                Reschedule
              </Button>

              <Button
                type="button"
                variant="secondary"
                disabled={completedDisabled}
                onClick={() =>
                  onToggleCompleted &&
                  void runAction(() => onToggleCompleted(consultation))
                }
              >
                {consultation.status === 'completed' ? (
                  <CheckCircle2 aria-hidden="true" />
                ) : (
                  <Circle aria-hidden="true" />
                )}

                {consultation.status === 'completed'
                  ? 'Mark incomplete'
                  : 'Mark complete'}
              </Button>

              <Button
                type="button"
                variant="destructive"
                disabled={actionDisabled}
                onClick={() =>
                  onCancel && void runAction(() => onCancel(consultation.id))
                }
              >
                <XCircle aria-hidden="true" />
                Cancel
              </Button>
            </div>
          </div>
        )
      }
    />
  );
};
