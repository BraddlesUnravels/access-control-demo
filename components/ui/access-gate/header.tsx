import { Typography } from '@/components/ui/typography';
import { ShieldCheck } from 'lucide-react';

export const Header = () => (
  <header id="header" className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="relative flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <ShieldCheck className="size-4.5 text-cyan-300" aria-hidden="true" />

        <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-[#080b12] bg-emerald-400" />
      </div>

      <div>
        <Typography
          as="p"
          variant="body-small"
          className="font-semibold tracking-wide text-zinc-100"
        >
          Access Control Demo
        </Typography>
        <Typography
          as="p"
          variant="body-small"
          className="mt-0.5 text-zinc-500"
        >
          Full-stack security portfolio
        </Typography>
      </div>
    </div>
    <div className="hidden items-center gap-3 rounded-full border border-emerald-400/15 bg-emerald-400/6 px-6 py-2 sm:flex">
      <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.9)]" />
      <Typography
        as="span"
        variant="caption"
        className="font-mono uppercase tracking-[0.14em] text-emerald-300"
      >
        Demo online
      </Typography>
    </div>
  </header>
);
