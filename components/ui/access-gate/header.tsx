import { Typography } from '@/components/ui/typography';
import { BriefcaseIcon } from 'lucide-react';

export const Header = () => (
  <header id="header" className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="relative flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <BriefcaseIcon className="size-4.5 text-cyan-300" aria-hidden="true" />

        <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-[#080b12] bg-emerald-400" />
      </div>

      <div>
        <Typography
          as="p"
          variant="body-small"
          className="font-semibold tracking-wide text-zinc-100"
        >
          Bradley Laskey
        </Typography>
        <Typography
          as="p"
          variant="body-small"
          className="mt-0.5 text-zinc-500"
        >
          FULL STACK DEVELOPER
        </Typography>
      </div>
    </div>
  </header>
);
