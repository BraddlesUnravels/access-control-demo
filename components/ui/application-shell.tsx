import { Suspense, type ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';
import { SignOutButton } from './sign-out-button';
import { InternalBackground } from '@/components/ui/internal-background';
import { Skeleton } from '@/components/ui/skeleton';
import { Typography } from '@/components/ui/typography';

export const ApplicationShell = ({ children }: { children: ReactNode }) => (
  <div className="min-h-svh w-full">
    <InternalBackground />

    <div className="flex flex-col min-w-full">
      <nav className="sticky top-0 z-50 backdrop-blur-sm">
        <div className="mx-auto flex min-h-[3.5rem] w-full max-w-[1900px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <ShieldCheck
                className="size-[18px] text-cyan-300"
                aria-hidden="true"
              />

              <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-[#080b12] bg-emerald-400" />
            </div>

            <div className="min-w-0">
              <Typography
                as="p"
                variant="body-small"
                className="truncate font-semibold tracking-wide text-zinc-100"
              >
                Access Control Demo
              </Typography>

              <Typography
                as="p"
                variant="caption"
                className="mt-0.5 hidden font-mono text-[10px] uppercase tracking-[0.13em] text-zinc-600 sm:block"
              >
                Authenticated application
              </Typography>
            </div>
          </div>

          <div className="hidden items-center gap-3 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-4 py-2 lg:flex">
            <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]" />

            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-300">
              Session active
            </span>
          </div>

          <Suspense
            fallback={<Skeleton className="h-8 w-8 rounded-md sm:w-40" />}
          >
            <SignOutButton />
          </Suspense>
        </div>
      </nav>

      <main className="relative z-0 mx-auto w-full max-w-[1900px] flex-1 flex-col px-5 py-5">
        {children}
      </main>
    </div>
  </div>
);
