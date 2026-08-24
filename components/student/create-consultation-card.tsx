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

const DEFAULT_FORM: CreateConsultationForm = {
  firstName: '',
  lastName: '',
  reason: '',
  scheduledFor: '',
};

export const CreateConsultationCard = () => {
  const [createForm, setCreateForm] =
    useState<CreateConsultationForm>(DEFAULT_FORM);
  const { createConsultation, error } = useStudentConsultationActions();
  const [submittingCreate, setSubmittingCreate] = useState(false);

  const handleCreateConsultation = async (event: React.SubmitEvent) => {
    event.preventDefault();
    setSubmittingCreate(true);

    try {
      await createConsultation(createForm);
      setCreateForm(DEFAULT_FORM);
    } catch (error) {
      return;
    } finally {
      setSubmittingCreate(false);
    }
  };

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
              id="scheduled-for"
              type="datetime-local"
              value={createForm.scheduledFor}
              onClick={(event) => event.currentTarget.showPicker()}
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
              type="submit"
              className="w-full md:w-auto"
              disabled={submittingCreate}
            >
              <CalendarPlus aria-hidden="true" />

              {submittingCreate ? 'Creating...' : 'Create consultation'}
            </Button>
          </div>

          {error ? (
            <div
              role="alert"
              className="rounded-xl border border-red-400/15 bg-red-400/[0.06] px-4 py-3 text-sm text-red-300"
            >
              {error}
            </div>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
};
