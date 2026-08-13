import type { ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Typography } from '@/components/ui/typography';

type AuthPanelNoteProps = {
  children: ReactNode;
};

export const AuthPanelNote = ({ children }: AuthPanelNoteProps) => (
  <div className="flex gap-3">
    <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.035]">
      <ShieldCheck className="size-5 text-zinc-500" aria-hidden="true" />
    </div>

    <Typography as="p" variant="body-small" className="leading-5 text-zinc-600">
      {children}
    </Typography>
  </div>
);
