'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

export const CreateConsultationCard = ({ onCreateConsultation }: CreateConsultationCardProps) => {
  const [createForm, setCreateForm] = useState<CreateConsultationForm>(DEFAULT_FORM);
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
    <Card>
      <CardHeader>
        <CardTitle>Create consultation</CardTitle>
        <CardDescription>Fill in the required fields and choose a date and time.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCreateConsultation} className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="first-name">First name</Label>
            <Input
              id="first-name"
              value={createForm.firstName}
              onChange={(event) =>
                setCreateForm((state) => ({ ...state, firstName: event.target.value }))
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
                setCreateForm((state) => ({ ...state, lastName: event.target.value }))
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
                setCreateForm((state) => ({ ...state, reason: event.target.value }))
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
                setCreateForm((state) => ({ ...state, scheduledFor: event.target.value }))
              }
              required
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={submittingCreate}>
              {submittingCreate ? 'Creating...' : 'Create consultation'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
