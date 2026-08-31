'use client';

import { ShieldCheck } from 'lucide-react';
import { AdminHeader } from './admin-header';
import { ConsultationListAdmin } from './admin-consultation-list';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const AdminConsultationsView = () => (
  <div id="admin-consultation-view" className="flex w-full flex-col gap-7">
    <AdminHeader />

    <Card className="col-span-1 overflow-hidden flex flex-col lg:max-h-[calc(100svh-11rem)] 2xl:col-span-2">
      <CardHeader className="border-b border-white/6 bg-white/12">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-zinc-100">All consultations</CardTitle>

            <CardDescription className="mt-1.5">
              Read-only visibility across consultation records owned by every
              student account.
            </CardDescription>
          </div>

          <div className="hidden size-9 items-center justify-center rounded-xl border border-white/7 bg-black/20 sm:flex">
            <ShieldCheck className="size-4 text-zinc-500" aria-hidden="true" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <ConsultationListAdmin />
      </CardContent>
    </Card>
  </div>
);
