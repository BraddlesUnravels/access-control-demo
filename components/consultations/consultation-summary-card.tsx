'use client';

import type { ReactNode } from 'react';
import { CalendarDays, ShieldCheck, UserRound } from 'lucide-react';
import { Typography } from '../ui/typography';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ConsultationRecord } from '@/lib/validation/types';

type ConsultationSummaryCardProps = {
  consultation: ConsultationRecord;
  showStudentUserId?: boolean;
  actions?: ReactNode;
  className?: string;
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
    <article
      className={cn(
        'group rounded-xl border border-white/[0.07] bg-black/15 p-4',
        'transition-[border-color,background-color,box-shadow,transform] duration-200',
        'hover:-translate-y-0.5 hover:border-cyan-300/15 hover:bg-white/[0.03]',
        'hover:shadow-[0_16px_44px_rgba(0,0,0,0.2)]',
        'sm:p-5',
        className,
      )}
    >
      <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035] transition-colors group-hover:border-cyan-300/15">
            <UserRound
              className="size-4 text-zinc-500 transition-colors group-hover:text-cyan-200"
              aria-hidden="true"
            />
          </div>

          <div className="min-w-0">
            <Typography
              variant="component-title"
              className="truncate font-semibold text-zinc-100"
            >
              {consultation.first_name} {consultation.last_name}
            </Typography>

            <Typography variant="body" className="mt-1 leading-5 text-zinc-500">
              {consultation.reason}
            </Typography>
          </div>
        </div>

        <Badge
          variant={statusVariantByConsultationStatus[consultation.status]}
          className="w-fit"
        >
          {consultation.status}
        </Badge>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-white/[0.055] bg-black/20 px-3.5 py-3">
          <div className="mb-1.5 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.13em] text-zinc-600">
            <CalendarDays className="size-3" aria-hidden="true" />
            <Typography variant="caption" className="-mb-1">
              Scheduled for
            </Typography>
          </div>

          <Typography variant="body" className="text-zinc-300">
            {new Date(consultation.scheduled_for).toLocaleString()}
          </Typography>
        </div>

        <div className="rounded-lg border border-white/[0.055] bg-black/20 px-3.5 py-3">
          {showStudentUserId ? (
            <div className="rounded-lg border border-white/[0.055] bg-black/20 px-3.5 py-3">
              <Typography
                variant="caption"
                className="mb-1.5 font-mono uppercase tracking-[0.13em] text-zinc-600"
              >
                Student user ID
              </Typography>

              <Typography
                variant="caption"
                className="truncate font-mono text-zinc-400"
              >
                {consultation.student_user_id}
              </Typography>
            </div>
          ) : (
            <div className="rounded-lg border border-white/[0.055] bg-black/20 px-3.5 py-3">
              <div className="mb-1.5 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.13em] text-zinc-600">
                <ShieldCheck className="size-3" aria-hidden="true" />
                <Typography variant="caption" className="-mb-1">
                  Access scope
                </Typography>
              </div>

              <Typography variant="body" className="text-zinc-400">
                {actions ? 'Authenticated owner' : 'Read-only'}
              </Typography>
            </div>
          )}
        </div>
      </div>

      {actions}
    </article>
  );
};
