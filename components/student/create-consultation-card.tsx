'use client';

import { useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import {
  CONSULTATION_NAME_MAX_LENGTH,
  CONSULTATION_REASON_MAX_LENGTH,
} from '@/lib/validation/limits';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input, DateTimeInput } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CreateConsultationForm } from '@/lib/validation/types';
import { useStudentConsultationActions } from './student-consultation-action-hook';
import { getErrorMessage } from '@/lib/utils';

const DEFAULT_FORM: CreateConsultationForm = {
  firstName: '',
  lastName: '',
  reason: '',
  scheduledFor: '',
};

export const CreateConsultationCard = () => {
  const [createForm, setCreateForm] =
    useState<CreateConsultationForm>(DEFAULT_FORM);
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | undefined>();
  const { createConsultation, error: consultationError } =
    useStudentConsultationActions();

  const handleCreateConsultation = async (event: React.SubmitEvent) => {
    event.preventDefault();
    setSubmissionError(undefined);
    setSubmittingCreate(true);

    try {
      await createConsultation(createForm);
      setCreateForm(DEFAULT_FORM);
    } catch (caughtError) {
      setSubmissionError(getErrorMessage(caughtError));
    } finally {
      setSubmittingCreate(false);
    }
  };

  const displayedError =
    consultationError === undefined
      ? submissionError
      : getErrorMessage(consultationError);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-white/[0.06] bg-white/[0.015]">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300/15 bg-cyan-300/[0.06]">
            <CalendarPlus className="size-4 text-cyan-300" aria-hidden="true" />
          </div>

          <div>
            <CardTitle>Create consultation</CardTitle>

            <CardDescription className="mt-1.5">
              Add a new consultation record and choose its scheduled date and
              time.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <form
          onSubmit={handleCreateConsultation}
          className="grid gap-5 md:grid-cols-2"
        >
          <div className="grid gap-2">
            <Label htmlFor="first-name">First name</Label>

            <Input
              id="first-name"
              value={createForm.firstName}
              onChange={(event) =>
                setCreateForm((state) => ({
                  ...state,
                  firstName: event.target.value,
                }))
              }
              required
              maxLength={CONSULTATION_NAME_MAX_LENGTH}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="last-name">Last name</Label>

            <Input
              id="last-name"
              value={createForm.lastName}
              onChange={(event) =>
                setCreateForm((state) => ({
                  ...state,
                  lastName: event.target.value,
                }))
              }
              required
              maxLength={CONSULTATION_NAME_MAX_LENGTH}
            />
          </div>

          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="reason">Reason</Label>

            <Input
              id="reason"
              value={createForm.reason}
              onChange={(event) =>
                setCreateForm((state) => ({
                  ...state,
                  reason: event.target.value,
                }))
              }
              required
              maxLength={CONSULTATION_REASON_MAX_LENGTH}
            />
          </div>

          <div className="grid gap-2 lg:justify-start">
            <Label htmlFor="scheduled-for">Date and time</Label>

            <DateTimeInput
              data-testid="scheduled-for-input"
              id="scheduled-for"
              type="datetime-local"
              value={createForm.scheduledFor}
              onChange={(event) =>
                setCreateForm((state) => ({
                  ...state,
                  scheduledFor: event.target.value,
                }))
              }
              required
            />
          </div>

          <div className="flex justify-end items-end">
            <Button
              data-testid="create-consultation-button"
              type="submit"
              className="w-full md:w-auto"
              disabled={submittingCreate}
              aria-busy={submittingCreate}
            >
              <CalendarPlus aria-hidden="true" />

              {submittingCreate ? 'Creating...' : 'Create consultation'}
            </Button>
          </div>

          {displayedError && (
            <div
              role="alert"
              className="rounded-xl border border-red-400/15 bg-red-400/[0.06] px-4 py-3 text-sm text-red-300 md:col-span-2"
            >
              {displayedError}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
};
