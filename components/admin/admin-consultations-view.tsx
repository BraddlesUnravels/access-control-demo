'use client';

import { useEffect, useState } from 'react';
import { ConsultationSummaryCard } from '@/components/consultations/consultation-summary-card';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getApiErrorMessage, readJsonResponse } from '@/lib/api-response';
import type { ConsultationRecord } from '@/lib/validation/types';

export const AdminConsultationsView = () => {
  const [consultations, setConsultations] = useState<ConsultationRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    const loadConsultations = async () => {
      try {
        const response = await fetch('/api/admin/consultations', {
          method: 'GET',
        });

        const payload = await readJsonResponse<{
          data?: ConsultationRecord[];
          error?: string;
        }>(response);

        if (!response.ok) {
          throw new Error(
            getApiErrorMessage(
              payload,
              'Failed to load administrator consultations',
            ),
          );
        }

        if (!payload?.data) {
          throw new Error('Failed to load administrator consultations');
        }

        setConsultations(payload.data);
      } catch (loadError) {
        const message =
          loadError instanceof Error
            ? loadError.message
            : 'Failed to load administrator consultations';

        setError(message);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(() => {
      void loadConsultations();
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Administrator dashboard</h1>

        <p className="text-sm text-muted-foreground">
          Administrators can view consultations across the LMS but cannot modify
          them.
        </p>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>All consultations</CardTitle>

          <CardDescription>
            Read-only access to consultations from every student.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">
              Loading consultations...
            </p>
          ) : null}

          {!loading && consultations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No consultations found.
            </p>
          ) : null}

          {!loading
            ? consultations.map((consultation) => (
                <ConsultationSummaryCard
                  key={consultation.id}
                  consultation={consultation}
                  showStudentUserId
                />
              ))
            : null}
        </CardContent>
      </Card>
    </div>
  );
};
