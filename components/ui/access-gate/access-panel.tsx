import { Suspense } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { AccessGateForm } from '@/components/ui/forms/access-gate-form';
import { getSafeAccessGateDestination } from '@/lib/access-gate/paths';
import type { AccessPageSearchParams } from '@/app/page';

type Props = {
  searchParams: AccessPageSearchParams;
};

const AccessPageContent = async ({
  searchParams,
}: {
  searchParams: AccessPageSearchParams;
}) => {
  const params = await searchParams;
  const nextPath = getSafeAccessGateDestination(params.next);

  return <AccessGateForm initialCode={params.code ?? ''} nextPath={nextPath} />;
};

export const AccessPanel = ({ searchParams }: Props) => (
  <div className="relative mx-auto w-full max-w-[460px]">
    <div className="rounded-[28px] border border-white/[0.1] bg-white/[0.055] p-1.5 shadow-[0_32px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      <div className="rounded-[22px] border border-white/[0.07] bg-[#0d1119]/95 p-7 sm:p-9">
        <div className="mb-9">
          <div className="mb-7 flex items-start justify-between">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <KeyRound className="size-5 text-cyan-200" aria-hidden="true" />
            </div>

            <span className="rounded-full border border-white/[0.07] bg-white/[0.035] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.15em] text-zinc-600">
              Gate 01
            </span>
          </div>

          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-cyan-300">
            Private demo access
          </p>

          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-[2.1rem]">
            Enter the application
          </h2>

          <p className="mt-4 text-sm leading-6 text-zinc-500">
            Use the invite code supplied with the portfolio link. This gate only
            opens the hosted demo; authentication and application roles remain
            separate.
          </p>
        </div>

        <Suspense fallback={<AccessGateForm />}>
          <AccessPageContent searchParams={searchParams} />
        </Suspense>

        <div className="mt-8 border-t border-white/[0.07] pt-6">
          <div className="flex gap-3">
            <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.035]">
              <ShieldCheck
                className="size-3.5 text-zinc-500"
                aria-hidden="true"
              />
            </div>

            <p className="text-xs leading-5 text-zinc-600">
              Invite codes are verified server-side using an HMAC digest.
              Plaintext codes are never stored in PostgreSQL.
            </p>
          </div>
        </div>
      </div>
    </div>

    <p className="mt-5 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-700">
      Access gate · authentication · authorization · RLS
    </p>
  </div>
);
