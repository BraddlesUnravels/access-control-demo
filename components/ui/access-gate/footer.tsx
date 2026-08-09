import { LockKeyhole } from 'lucide-react';
import { Typography } from '@/components/ui/typography';

const technologies = [
  'Next.js',
  'TypeScript',
  'Supabase',
  'PostgreSQL',
  'Docker',
  'Azure',
];

export const Footer = () => (
  <footer className="flex gap-2 border-t border-white/[0.06] pt-5 flex-row justify-between">
    <div className="flex flex-wrap gap-2 md:gap-x-6 hover:cursor-default">
      {technologies.map((technology) => (
        <Typography
          id={`tech-${technology}`}
          as="span"
          variant="caption"
          key={technology}
          className="font-medium text-zinc-600 transition-colors hover:text-zinc-400"
        >
          {technology}
        </Typography>
      ))}
    </div>

    <div className="flex items-center justify-end gap-2 text-zinc-700 pointer-events-none">
      <div className="flex size-6 items-center justify-center rounded-md border border-white/[0.06] bg-white/[0.025]">
        <LockKeyhole className="size-3 text-zinc-600" aria-hidden="true" />
      </div>

      <div className="hidden md:flex">
        <Typography
          as="span"
          variant="caption"
          className="font-mono uppercase tracking-[0.12em] text-zinc-600"
        >
          Defence in depth
        </Typography>
      </div>
    </div>
  </footer>
);
