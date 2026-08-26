import { Typography } from '@/components/ui/typography';
import {
  ArrowRight,
  Database,
  KeyRound,
  ServerCog,
  UserRoundCheck,
} from 'lucide-react';

const securityLayers = [
  {
    number: '01',
    icon: KeyRound,
    title: 'Invite gate',
    description: 'Controls access to the hosted portfolio environment.',
  },
  {
    number: '02',
    icon: UserRoundCheck,
    title: 'Authentication',
    description: 'Supabase Auth establishes the signed-in application user.',
  },
  {
    number: '03',
    icon: ServerCog,
    title: 'Authorization',
    description: 'Server handlers enforce roles and resource ownership.',
  },
  {
    number: '04',
    icon: Database,
    title: 'Database policy',
    description: 'PostgreSQL RLS independently enforces data access.',
  },
];

const chipName = [
  'HMAC invites',
  'Signed cookies',
  'RBAC',
  'Ownership checks',
  'PostgreSQL RLS',
];

export const Architecture = () => (
  <div id="architecture" className="max-w-[80rem] pb-[2rem]">
    <div className="mb-[1.5rem] flex items-end justify-between">
      <div>
        <Typography
          as="p"
          variant="body-large"
          className="font-mono uppercase tracking-[0.2em] text-zinc-600"
        >
          Request lifecycle
        </Typography>

        <Typography as="p" variant="body-small" className="mt-1 text-zinc-400">
          Independent enforcement across four boundaries
        </Typography>
      </div>

      <Typography
        as="p"
        variant="body-small"
        className="hidden font-mono text-zinc-700 md:block"
      >
        REQUEST → IDENTITY → POLICY → DATA
      </Typography>
    </div>

    <ol className="relative grid grid-cols-2 overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.025] shadow-2xl shadow-black/20 backdrop-blur-sm lg:grid-cols-4 lg:overflow-y-visible">
      {securityLayers.map(
        ({ number, icon: Icon, title, description }, index) => (
          <li
            key={title}
            className={[
              'group relative min-h-[13rem] border-white/[0.07] p-5',
              'transition-colors duration-300 hover:bg-white/[0.035]',
              'hover:cursor-default',
              'sm:[&:nth-child(odd)]:border-r',
              'sm:[&:nth-child(-n+2)]:border-b',
              'overflow-y-clip',
              'lg:border-b-0',
              'lg:border-r',
              'lg:last:border-r-0',
            ].join(' ')}
          >
            <div className="flex items-start justify-between">
              <Typography
                as="span"
                variant="caption"
                className="font-mono font-medium text-cyan-300/80"
              >
                {number}
              </Typography>

              <div className="flex size-8.5 items-center justify-center rounded-lg border border-white/[0.08] bg-black/20">
                <Icon
                  className="size-4.5 text-zinc-500 transition-colors duration-300 group-hover:text-cyan-200"
                  aria-hidden="true"
                />
              </div>
            </div>

            <div className="mt-[0.6rem]">
              <Typography
                as="h2"
                variant="component-title"
                className="font-semibold text-zinc-100"
              >
                {title}
              </Typography>

              <Typography
                as="p"
                variant="body-large"
                className="mt-[1rem] leading-6 text-zinc-500"
              >
                {description}
              </Typography>
            </div>

            {index < securityLayers.length - 1 && (
              <div className="absolute right-[-0.8rem] top-1/2 z-20 hidden size-[1.5rem] -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#0c1018] lg:flex">
                <ArrowRight
                  className="size-4 text-zinc-600"
                  aria-hidden="true"
                />
              </div>
            )}

            <Typography
              as="span"
              variant="display"
              className="absolute -bottom-[1.125rem] -right-[0.09rem] font-mono font-semibold tracking-tighter text-white/[0.018] transition-colors group-hover:text-cyan-300/[0.035]"
            >
              {number}
            </Typography>
          </li>
        ),
      )}
    </ol>

    <div className="mt-[1.5rem] hidden sm:gap-4 sm:flex sm:flex-wrap sm:justify-center lg:gap-4 lg:justify-start pointer-events-none">
      {chipName.map((item) => (
        <Typography
          as="span"
          variant="caption"
          key={item}
          className="rounded-full border border-white/[0.07] bg-white/[0.025] px-[1rem] py-[0.4rem] font-mono uppercase tracking-[0.08em] text-zinc-500"
        >
          {item}
        </Typography>
      ))}
    </div>
  </div>
);
