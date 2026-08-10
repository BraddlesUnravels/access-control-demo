'use client';

import { useEffect, useState } from 'react';
import { Eye, ShieldCheck } from 'lucide-react';

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
    <div className="flex w-full flex-col gap-7">
      <header className="flex flex-col justify-between gap-5 border-b border-white/[0.06] pb-7 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 flex items-center gap-3">
            <span className="h-px w-7 bg-cyan-300/70" />

            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-cyan-300">
              Administrator workspace
            </p>
          </div>

          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white">
            Consultation dashboard
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
            Review consultation records across the LMS through the
            administrator&apos;s read-only access path.
          </p>
        </div>

        <div className="flex w-fit items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.06] px-3.5 py-2">
          <Eye className="size-3.5 text-cyan-200" aria-hidden="true" />

          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-cyan-200">
            Read only
          </span>
        </div>
      </header>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-400/15 bg-red-400/[0.06] px-4 py-3 text-sm text-red-300"
        >
          {error}
        </div>
      ) : null}

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-white/[0.06] bg-white/[0.012]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-zinc-100">All consultations</CardTitle>

              <CardDescription className="mt-1.5">
                Read-only visibility across consultation records owned by every
                student account.
              </CardDescription>
            </div>

            <div className="hidden size-9 items-center justify-center rounded-xl border border-white/[0.07] bg-black/20 sm:flex">
              <ShieldCheck
                className="size-4 text-zinc-500"
                aria-hidden="true"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 pt-6">
          {loading ? (
            <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.015] px-4 py-10 text-center text-sm text-zinc-600">
              Loading consultations...
            </div>
          ) : null}

          {!loading && consultations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.015] px-4 py-10 text-center text-sm text-zinc-600">
              No consultations found.
            </div>
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
