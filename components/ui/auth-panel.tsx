import { ReactNode } from 'react';
import { Typography } from '@/components/ui/typography';
import { cn } from '@/lib/utils';

type AccessPanelProps = {
  icon: ReactNode;
  badge?: string;
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  footer?: ReactNode;
  caption?: string;
  children: ReactNode;
  className?: string;
};

export const AuthPanel = ({
  icon,
  badge,
  eyebrow,
  title,
  description,
  footer,
  caption,
  children,
  className,
}: AccessPanelProps) => (
  <div
    id="auth-gate-layout"
    className={cn('mx-auto w-full max-w-[460px]', className)}
  >
    <div
      id="auth-gate-inner-wrap"
      className="rounded-[2rem] border border-white/[0.1] bg-white/[0.055] p-[0.4rem] shadow-[0_32px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl"
    >
      <div className="rounded-[1.6rem] border border-white/[0.07] bg-[#0d1119]/95 p-[2.25] lg:p-[1.75rem]">
        <div className="mb-[1.7rem]">
          <div className="mb-[1.7rem] flex items-start justify-between">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.07]">
              {icon}
            </div>

            {badge && (
              <Typography
                as="span"
                variant="caption"
                className="rounded-full border border-white/[0.07] bg-white/[0.035] px-[0.625rem] py-[0.25rem] font-mono uppercase tracking-[0.15em] text-zinc-600"
              >
                {badge}
              </Typography>
            )}
          </div>

          {eyebrow && (
            <Typography
              as="p"
              variant="body"
              className="font-mono font-medium uppercase tracking-[0.2em] text-cyan-300"
            >
              {eyebrow}
            </Typography>
          )}

          <Typography
            as="h1"
            variant="page-title"
            className="mt-3 font-semibold tracking-[-0.04em] text-white"
          >
            {title}
          </Typography>

          {description && (
            <Typography
              as="p"
              variant="body"
              className="mt-4 leading-6 text-zinc-500"
            >
              {description}
            </Typography>
          )}
        </div>

        {children}

        {footer && (
          <div className="mt-8 border-t border-white/[0.07] pt-6">{footer}</div>
        )}
      </div>
    </div>

    {caption && (
      <Typography
        as="p"
        variant="caption"
        className="mt-5 text-center font-mono uppercase text-zinc-700 lg:tracking-[0.12em]"
      >
        {caption}
      </Typography>
    )}
  </div>
);
