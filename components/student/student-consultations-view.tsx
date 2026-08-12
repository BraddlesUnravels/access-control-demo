'use client';

import { ShieldCheck, UserRound } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ConsultationList } from './consultation-list';
import { CreateConsultationCard } from './create-consultation-card';
import { useStudentConsultationActions } from './student-consultation-action-hook';
import { useStudentConsultations } from './student-consultation-hook';

export const StudentConsultationsView = () => {
  const {
    consultations,
    loading,
    error: loadError,
  } = useStudentConsultations();

  const {
    error: actionError,
    createConsultation,
    toggleCompleted,
    reschedule,
    cancelConsultation,
  } = useStudentConsultationActions();

  const error = actionError ?? loadError;

  return (
    <div className="flex w-full flex-col gap-7">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <UserRound className="size-3.5 text-cyan-300" aria-hidden="true" />

            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-300">
              Student workspace
            </p>
          </div>

          <h1 className="text-3xl font-semibold tracking-[-0.035em]">
            Consultation dashboard
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            View and manage only the consultation records associated with your
            authenticated account.
          </p>
        </div>

        <div className="flex w-fit items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-3 py-1.5">
          <ShieldCheck
            className="size-3.5 text-emerald-300"
            aria-hidden="true"
          />

          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-300">
            Ownership scoped
          </span>
        </div>
      </header>

      <CreateConsultationCard onCreateConsultation={createConsultation} />

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-400/15 bg-red-400/[0.06] px-4 py-3 text-sm text-red-300"
        >
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader className="border-b border-white/[0.06]">
          <CardTitle>Your consultations</CardTitle>

          <CardDescription>
            Create, reschedule, complete, or cancel your own consultation
            records.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          {loading ? (
            <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-10 text-center text-sm text-muted-foreground">
              Loading consultations...
            </div>
          ) : (
            <ConsultationList
              consultations={consultations}
              onCancel={cancelConsultation}
              onReschedule={reschedule}
              onToggleCompleted={toggleCompleted}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
