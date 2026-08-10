'use client';

import { useState } from 'react';
import { CalendarPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CreateConsultationForm } from '@/lib/validation/types';

const DEFAULT_FORM: CreateConsultationForm = {
  firstName: '',
  lastName: '',
  reason: '',
  scheduledFor: '',
};

type CreateConsultationCardProps = {
  onCreateConsultation: (createForm: CreateConsultationForm) => Promise<void>;
};

export const CreateConsultationCard = ({
  onCreateConsultation,
}: CreateConsultationCardProps) => {
  const [createForm, setCreateForm] =
    useState<CreateConsultationForm>(DEFAULT_FORM);
  const [submittingCreate, setSubmittingCreate] = useState(false);

  const handleCreateConsultation = async (event: React.SubmitEvent) => {
    event.preventDefault();
    setSubmittingCreate(true);

    try {
      await onCreateConsultation(createForm);
      setCreateForm(DEFAULT_FORM);
    } catch {
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
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="scheduled-for">Date and time</Label>

            <Input
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

          <div className="flex items-end md:justify-end">
            <Button
              type="submit"
              className="w-full md:w-auto"
              disabled={submittingCreate}
            >
              <CalendarPlus aria-hidden="true" />

              {submittingCreate ? 'Creating...' : 'Create consultation'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
