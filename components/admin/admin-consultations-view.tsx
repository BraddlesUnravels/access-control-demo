'use client';

import { useEffect, useState } from 'react';
import { ConsultationSummaryCard } from '@/components/consultations/consultation-summary-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getApiErrorMessage, readJsonResponse } from '@/lib/api-response';
import type { ConsultationRecord } from '@/lib/validation/types';

export const AdminConsultationsView = () => {
  const [consultations, setConsultations] = useState<ConsultationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  const loadConsultations = async () => {
    setLoading(true);
    setError(undefined);

    try {
      const response = await fetch('/api/admin/consultations', { method: 'GET' });
      const payload = await readJsonResponse<{ data?: ConsultationRecord[]; error?: string }>(
        response,
      );

      if (!response.ok)
        throw new Error(getApiErrorMessage(payload, 'Failed to load admin consultations'));
      if (!payload?.data) throw new Error('Failed to load admin consultations');

      setConsultations(payload.data);
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : 'Failed to load admin consultations';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadConsultations();
  }, []);

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Admin consultations</h1>
        <p className="text-sm text-muted-foreground">
          Read-only view of all consultations across the application.
        </p>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>All consultations</CardTitle>
          <CardDescription>
            Admin read-only access. No mutation actions are available.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading consultations...</p>
          ) : null}
          {!loading && consultations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No consultations found.</p>
          ) : null}
          <div className="flex flex-col gap-4">
            {consultations.map((consultation) => (
              <ConsultationSummaryCard
                key={consultation.id}
                consultation={consultation}
                showStudentUserId
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
