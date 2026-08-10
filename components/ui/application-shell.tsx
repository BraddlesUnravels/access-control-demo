import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { ShieldCheck } from 'lucide-react';

import { AuthButton } from '@/components/ui/auth-button';
import { InternalBackground } from '@/components/ui/internal-background';

export const ApplicationShell = ({ children }: { children: ReactNode }) => (
  <div className="min-h-svh w-full">
    <InternalBackground />

    <div className="flex flex-col min-w-full">
      <nav className="sticky top-0 z-50 border-b border-cyan-300/[0.08] bg-[#080d14]/10 shadow-[0_1px_20px_rgba(34,211,238,0.04)] backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-[72px] w-full max-w-[1280px] items-center justify-between gap-4 px-5 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <ShieldCheck
                className="size-[18px] text-cyan-300"
                aria-hidden="true"
              />

              <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-[#080b12] bg-emerald-400" />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-wide text-zinc-100">
                Access Control Demo
              </p>

              <p className="mt-0.5 hidden font-mono text-[10px] uppercase tracking-[0.13em] text-zinc-600 sm:block">
                Authenticated application
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-3 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-4 py-2 lg:flex">
            <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]" />

            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-300">
              Session active
            </span>
          </div>

          <Suspense>
            <AuthButton />
          </Suspense>
        </div>
      </nav>

      <main className="relative z-0 mx-auto w-full max-w-[1280px] flex-1 flex-col px-5 py-9 sm:px-8 sm:py-12">
        {children}
      </main>
    </div>
  </div>
);
