import { Typography } from '@/components/ui/typography';
import { ShieldCheck } from 'lucide-react';

import { InternalBackground } from '@/components/ui/internal-background';

export const AuthPageShell = ({ children }: { children: React.ReactNode }) => (
  <main
    id="auth-shell"
    className="relative flex flex-col min-h-svh overflow-hidden bg-[#080b12] text-zinc-100"
  >
    <InternalBackground />

    <header id="auth-header">
      <div className="flex h-16 items-center px-5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div
            className="
              relative flex size-9 items-center justify-center
              rounded-xl
              border border-white/[0.08]
              bg-white/[0.04]
              shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]
            "
          >
            <ShieldCheck className="size-4 text-cyan-300" aria-hidden="true" />

            <span
              aria-hidden="true"
              className="
                absolute -right-0.5 -top-0.5
                size-2
                rounded-full
                border-2 border-[#080b12]
                bg-emerald-400
              "
            />
          </div>

          <div>
            <Typography
              as="p"
              variant="body-small"
              className="text-xs font-semibold tracking-wide text-zinc-200"
            >
              Access Control Demo
            </Typography>

            <Typography
              as="p"
              variant="caption"
              className="mt-0.5 text-[10px] text-zinc-600"
            >
              Full-stack security portfolio
            </Typography>
          </div>
        </div>
      </div>
    </header>

    <div
      id="shell-inner-wrapper"
      className="flex flex-1 p-[1rem] lg:pr-[2rem] lg:-mt-[2.5rem]"
    >
      {children}
    </div>
  </main>
);
