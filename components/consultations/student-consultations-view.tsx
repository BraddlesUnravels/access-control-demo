'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ConsultationRecord } from '@/lib/types/consultation';

type CreateConsultationForm = {
  firstName: string;
  lastName: string;
  reason: string;
  scheduledFor: string;
};

type StudentConsultationsViewProps = {
  isAdmin: boolean;
};

const DEFAULT_FORM: CreateConsultationForm = {
  firstName: '',
  lastName: '',
  reason: '',
  scheduledFor: '',
};

const toDatetimeLocalValue = (isoString: string) => {
  const date = new Date(isoString);
  const timezoneOffsetMs = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
};

const toIsoDateString = (datetimeLocal: string) => {
  return new Date(datetimeLocal).toISOString();
};

export const StudentConsultationsView = ({ isAdmin }: StudentConsultationsViewProps) => {
  const [consultations, setConsultations] = useState<ConsultationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [createForm, setCreateForm] = useState<CreateConsultationForm>(DEFAULT_FORM);
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [actionInProgressById, setActionInProgressById] = useState<Record<string, boolean>>({});
  const [rescheduleById, setRescheduleById] = useState<Record<string, string>>({});

  const loadConsultations = async () => {
    setLoading(true);
    setError(undefined);

    try {
      const response = await fetch('/api/consultations', { method: 'GET' });
      const payload = await response.json();

      if (!response.ok) throw new Error(payload.error ?? 'Failed to load consultations');

      const records = payload.data as ConsultationRecord[];
      setConsultations(records);
      setRescheduleById(
        Object.fromEntries(
          records.map((record) => [record.id, toDatetimeLocalValue(record.scheduled_for)]),
        ),
      );
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : 'Failed to load consultations';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadConsultations();
  }, []);

  const setActionLoading = (consultationId: string, loadingState: boolean) => {
    setActionInProgressById((state) => ({
      ...state,
      [consultationId]: loadingState,
    }));
  };

  const handleCreateConsultation = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmittingCreate(true);
    setError(undefined);

    try {
      const response = await fetch('/api/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: createForm.firstName,
          lastName: createForm.lastName,
          reason: createForm.reason,
          scheduledFor: toIsoDateString(createForm.scheduledFor),
        }),
      });
      const payload = await response.json();

      if (!response.ok) throw new Error(payload.error ?? 'Failed to create consultation');

      setCreateForm(DEFAULT_FORM);
      await loadConsultations();
    } catch (createError) {
      const message =
        createError instanceof Error ? createError.message : 'Failed to create consultation';
      setError(message);
    } finally {
      setSubmittingCreate(false);
    }
  };

  const handleToggleCompleted = async (consultation: ConsultationRecord) => {
    setActionLoading(consultation.id, true);
    setError(undefined);

    try {
      const nextStatus = consultation.status === 'completed' ? 'scheduled' : 'completed';
      const response = await fetch(`/api/consultations/${consultation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = await response.json();

      if (!response.ok) throw new Error(payload.error ?? 'Failed to update consultation status');

      await loadConsultations();
    } catch (updateError) {
      const message =
        updateError instanceof Error ? updateError.message : 'Failed to update consultation status';
      setError(message);
    } finally {
      setActionLoading(consultation.id, false);
    }
  };

  const handleReschedule = async (consultation: ConsultationRecord) => {
    const datetimeLocal = rescheduleById[consultation.id];

    if (!datetimeLocal) {
      setError('Scheduled time is required');
      return;
    }

    setActionLoading(consultation.id, true);
    setError(undefined);

    try {
      const response = await fetch(`/api/consultations/${consultation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledFor: toIsoDateString(datetimeLocal) }),
      });
      const payload = await response.json();

      if (!response.ok) throw new Error(payload.error ?? 'Failed to reschedule consultation');

      await loadConsultations();
    } catch (rescheduleError) {
      const message =
        rescheduleError instanceof Error
          ? rescheduleError.message
          : 'Failed to reschedule consultation';
      setError(message);
    } finally {
      setActionLoading(consultation.id, false);
    }
  };

  const handleCancel = async (consultation: ConsultationRecord) => {
    setActionLoading(consultation.id, true);
    setError(undefined);

    try {
      const response = await fetch(`/api/consultations/${consultation.id}`, {
        method: 'DELETE',
      });
      const payload = await response.json();

      if (!response.ok) throw new Error(payload.error ?? 'Failed to cancel consultation');

      await loadConsultations();
    } catch (cancelError) {
      const message =
        cancelError instanceof Error ? cancelError.message : 'Failed to cancel consultation';
      setError(message);
    } finally {
      setActionLoading(consultation.id, false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Student consultations</h1>
        <p className="text-sm text-muted-foreground">
          Create, reschedule, complete, and cancel your own consultations.
        </p>
        {isAdmin ? (
          <p className="text-sm">
            You are an admin. Open the{' '}
            <Link href="/admin" className="underline underline-offset-4">
              admin consultations view
            </Link>
            .
          </p>
        ) : null}
      </div>

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

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Your consultations</CardTitle>
          <CardDescription>Manage your existing consultations.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading consultations...</p>
          ) : null}
          {!loading && consultations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No consultations yet.</p>
          ) : null}
          <div className="flex flex-col gap-4">
            {consultations.map((consultation) => {
              const actionInProgress = actionInProgressById[consultation.id] ?? false;

              return (
                <div key={consultation.id} className="rounded-md border p-4">
                  <div className="mb-3 flex flex-col gap-1">
                    <p className="font-medium">
                      {consultation.first_name} {consultation.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">{consultation.reason}</p>
                    <p className="text-sm">
                      Scheduled for {new Date(consultation.scheduled_for).toLocaleString()}
                    </p>
                    <p className="text-sm capitalize">Status: {consultation.status}</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
                    <div className="grid gap-2">
                      <Label htmlFor={`reschedule-${consultation.id}`}>Reschedule</Label>
                      <Input
                        id={`reschedule-${consultation.id}`}
                        type="datetime-local"
                        value={rescheduleById[consultation.id] ?? ''}
                        disabled={consultation.status === 'cancelled' || actionInProgress}
                        onChange={(event) =>
                          setRescheduleById((state) => ({
                            ...state,
                            [consultation.id]: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={consultation.status === 'cancelled' || actionInProgress}
                      onClick={() => void handleReschedule(consultation)}
                    >
                      Reschedule
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={consultation.status === 'cancelled' || actionInProgress}
                        onClick={() => void handleToggleCompleted(consultation)}
                      >
                        {consultation.status === 'completed' ? 'Mark incomplete' : 'Mark complete'}
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={consultation.status === 'cancelled' || actionInProgress}
                        onClick={() => void handleCancel(consultation)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
