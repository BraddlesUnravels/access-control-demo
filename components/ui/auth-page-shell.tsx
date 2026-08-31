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
              border border-white/8
              bg-white/4
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
              className="font-semibold tracking-wide text-zinc-200"
            >
              Access Control Demo
            </Typography>

            <Typography
              as="p"
              variant="caption"
              className="mt-0.5 text-zinc-600"
            >
              Full-stack security portfolio
            </Typography>
          </div>
        </div>
      </div>
    </header>

    <div id="shell-inner-wrapper" className="flex flex-1 p-4 lg:pr-8 lg:-mt-10">
      {children}
    </div>
  </main>
);
