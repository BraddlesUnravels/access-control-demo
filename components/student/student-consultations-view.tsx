'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ConsultationList } from './consultation-list';
import { CreateConsultationCard } from './create-consultation-card';
import { useStudentActions } from './student-actions-hook';

export const StudentConsultationsView = () => {
  const {
    consultations,
    loading,
    error,
    actionInProgressById,
    getRescheduleValue,
    setRescheduleValue,
    createConsultation,
    toggleCompleted,
    reschedule,
    cancelConsultation,
  } = useStudentActions();

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Student dashboard</h1>

        <p className="text-sm text-muted-foreground">
          Students can view and manage only the consultations associated with
          their own account.
        </p>
      </div>

      <CreateConsultationCard onCreateConsultation={createConsultation} />

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Your consultations</CardTitle>

          <CardDescription>
            Create, reschedule, complete, or cancel your consultations.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">
              Loading consultations...
            </p>
          ) : (
            <ConsultationList
              actionInProgressById={actionInProgressById}
              consultations={consultations}
              onCancel={cancelConsultation}
              onReschedule={reschedule}
              onRescheduleChange={setRescheduleValue}
              onToggleCompleted={toggleCompleted}
              getRescheduleValue={getRescheduleValue}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
