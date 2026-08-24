'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Suspense } from 'react';
import { StudentConsultHeader } from './consultation-header';
import { CreateConsultationCard } from './create-consultation-card';
import { Skeleton } from '@/components/ui/skeleton';
import { ConsultationListStudent } from './consultation-list-student';

export const StudentConsultationsView = () => (
  <div className="grid w-full gap-7 grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3">
    <div className="col-span-1">
      <StudentConsultHeader />

      <CreateConsultationCard />
    </div>

    <Card className="col-span-1 2xl:col-span-2 overflow-hidden flex flex-col lg:max-h-[calc(100svh-8rem)]">
      <CardHeader className="shrink-0 border-b border-white/[0.06]">
        <CardTitle>Your consultations</CardTitle>

        <CardDescription>
          Create, reschedule, complete, or cancel your own consultation records.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6 min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <ConsultationListStudent />
      </CardContent>
    </Card>
  </div>
);
