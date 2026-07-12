'use client';

import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ConsultationRecord } from '@/lib/validation/types';

type ConsultationSummaryCardProps = {
  actions?: ReactNode;
  className?: string;
  consultation: ConsultationRecord;
  showStudentUserId?: boolean;
};
const statusVariantByConsultationStatus = {
  scheduled: 'scheduled',
  cancelled: 'cancelled',
  completed: 'completed',
} as const;

export const ConsultationSummaryCard = ({
  actions,
  className,
  consultation,
  showStudentUserId = false,
}: ConsultationSummaryCardProps) => {
  return (
    <div className={cn('rounded-md border p-4', className)}>
      <div className="mb-3 flex flex-col gap-1">
        <p className="font-medium">
          {consultation.first_name} {consultation.last_name}
        </p>
        <p className="text-sm text-muted-foreground">{consultation.reason}</p>
        {showStudentUserId ? (
          <p className="text-sm">Student user id: {consultation.student_user_id}</p>
        ) : null}
        <p className="text-sm">
          Scheduled for {new Date(consultation.scheduled_for).toLocaleString()}
        </p>
        <div className="text-sm capitalize">
          Status:{' '}
          <Badge variant={statusVariantByConsultationStatus[consultation.status]}>
            {consultation.status}
          </Badge>
        </div>
      </div>
      {actions}
    </div>
  );
};
