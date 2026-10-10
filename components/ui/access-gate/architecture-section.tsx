import { Typography } from '@/components/ui/typography';
import {
  ArrowRight,
  ContainerIcon,
  AppWindowIcon,
  FingerprintIcon,
  FlaskConicalIcon,
} from 'lucide-react';

const securityLayers = [
  {
    number: '01',
    icon: AppWindowIcon,
    title: 'The application',
    description: 'Compare what different users can see and change.',
  },
  {
    number: '02',
    icon: FingerprintIcon,
    title: 'The access controls',
    description:
      'Follow role and ownership checks through the server and database.',
  },
  {
    number: '03',
    icon: FlaskConicalIcon,
    title: 'The tests',
    description:
      'Inspect how permitted actions and forbidden requests are checked.',
  },
  {
    number: '04',
    icon: ContainerIcon,
    title: 'The deployment',
    description:
      'Explore the container, deployment pipeline and Azure infrastructure.',
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
  <div id="architecture" className="max-w-7xl pb-8">
    <div className="mb-6 flex items-end justify-between">
      <div>
        <Typography
          as="p"
          variant="body-large"
          className="font-mono uppercase tracking-[0.2em] text-zinc-300"
        >
          What you can explore
        </Typography>

        <Typography as="p" variant="body-small" className="mt-1 text-zinc-600">
          Independent enforcement across four boundaries
        </Typography>
      </div>
    </div>

    <ol className="relative grid grid-cols-2 overflow-hidden rounded-xl border border-white/8 bg-white/2.5 shadow-2xl shadow-black/20 backdrop-blur-sm lg:grid-cols-4 lg:overflow-y-visible">
      {securityLayers.map(
        ({ number, icon: Icon, title, description }, index) => (
          <li
            key={title}
            className={[
              'group relative min-h-52 border-white/7 p-5',
              'transition-colors duration-300 hover:bg-white/3.5',
              'hover:cursor-default',
              'sm:odd:border-r',
              'sm:nth-[-n+2]:border-b',
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

              <div className="flex size-8.5 items-center justify-center rounded-lg border border-white/8 bg-black/20">
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
                className="mt-4 leading-6 text-zinc-500"
              >
                {description}
              </Typography>
            </div>

            {index < securityLayers.length - 1 && (
              <div className="absolute right-[-0.8rem] top-1/2 z-20 hidden size-6 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#0c1018] lg:flex">
                <ArrowRight
                  className="size-4 text-zinc-600"
                  aria-hidden="true"
                />
              </div>
            )}

            <Typography
              as="span"
              variant="display"
              className="absolute -bottom-4.5 right-[-0.09rem] font-mono font-semibold tracking-tighter text-white/[0.018] transition-colors group-hover:text-cyan-300/3.5"
            >
              {number}
            </Typography>
          </li>
        ),
      )}
    </ol>

    <div className="mt-6 hidden gap-4 sm:flex sm:flex-wrap sm:justify-center lg:gap-4 lg:justify-start pointer-events-none">
      {chipName.map((item) => (
        <Typography
          as="span"
          variant="caption"
          key={item}
          className="rounded-full border border-white/7 bg-white/2.5 px-4 py-[0.4rem] font-mono uppercase tracking-[0.08em] text-zinc-500"
        >
          {item}
        </Typography>
      ))}
    </div>
  </div>
);
