import { Eye } from 'lucide-react';
import { Typography } from '../ui/typography';

export const AdminHeader = () => (
  <header className="flex flex-col border-b border-white/[0.06] pb-2">
    <div className="flex w-full flex-row justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="h-px w-7 bg-cyan-300/70" />

        <Typography
          variant="caption"
          className="mt-1 font-mono font-medium uppercase tracking-[0.2em] text-cyan-300"
        >
          Administrator workspace
        </Typography>
      </div>

      <div className="hidden items-center lg:flex">
        <Typography
          variant="body"
          className="flex max-w-2xl leading-6 text-zinc-500"
        >
          Review consultation records across the LMS through the
          administrator&apos;s read-only access path.
        </Typography>
      </div>

      <div className="flex w-fit items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.06] px-3.5 py-2">
        <Eye className="size-3.5 text-cyan-200" aria-hidden="true" />

        <Typography
          variant="caption"
          className="font-mono uppercase tracking-[0.12em] text-cyan-200"
        >
          Read only
        </Typography>
      </div>
    </div>
  </header>
);
