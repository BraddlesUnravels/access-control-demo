import type { ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';

import { InternalBackground } from '@/components/ui/internal-background';

export const AuthPageShell = ({ children }: { children: ReactNode }) => (
  <main className="relative min-h-svh overflow-x-hidden bg-[#080b12] text-zinc-100">
    <InternalBackground />

    <header className="relative z-20">
      <div className="mx-auto flex h-[88px] w-full max-w-[1900px] items-center px-6 sm:px-10">
        <div className="flex items-center gap-3">
          <div className="relative flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <ShieldCheck
              className="size-[18px] text-cyan-300"
              aria-hidden="true"
            />

            <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-[#080b12] bg-emerald-400" />
          </div>

          <div>
            <p className="text-sm font-semibold tracking-wide text-zinc-100">
              Access Control Demo
            </p>

            <p className="mt-0.5 text-xs text-zinc-500">
              Full-stack security portfolio
            </p>
          </div>
        </div>
      </div>
    </header>

    <div className="relative z-10 grid min-h-[calc(100svh-88px)]">
      {children}
    </div>
  </main>
);
