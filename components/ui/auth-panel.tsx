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
      className={cn(
        'border border-white/[0.1]',
        'bg-white/[0.055]',
        'p-[0.25rem] sm:p-[0.375rem]',
        'rounded-[clamp(1.375rem,5vw,2rem)]',
        'shadow-[0_2rem_5.625rem_rgba(0,0,0,0.45)]',
        'backdrop-blur-xl',
      )}
    >
      <div
        className={cn(
          'border border-white/[0.07]',
          'bg-[#0d1119]/95',
          'rounded-[clamp(1.125rem,4vw,1.6rem)]',
          'p-[clamp(1rem,4vw,1.75rem)]',
        )}
      >
        <div className="mb-[clamp(1.25rem,4vw,1.7rem)]">
          <div
            className={cn(
              'flex items-start justify-between',
              'mb-[clamp(1.125rem,4vw,1.7rem)]',
            )}
          >
            <div
              className={cn(
                'flex items-center justify-center',
                'size-[clamp(2.5rem,10vw,3rem)]',
                'rounded-[clamp(0.75rem,3vw,1rem)]',
                'border border-cyan-300/15',
                'bg-cyan-300/[0.07]',
              )}
            >
              {icon}
            </div>

            {badge && (
              <Typography
                as="span"
                variant="caption"
                className={cn(
                  'rounded-full',
                  'border border-white/[0.07]',
                  'bg-white/[0.035]',
                  'px-[0.625rem] py-[0.25rem]',
                  'font-mono uppercase',
                  'tracking-[0.12em] sm:tracking-[0.15em]',
                  'text-zinc-600',
                )}
              >
                {badge}
              </Typography>
            )}
          </div>

          {eyebrow && (
            <Typography
              as="p"
              variant="body"
              className={cn(
                'font-mono font-medium uppercase',
                'tracking-[0.16em] sm:tracking-[0.2em]',
                'text-cyan-300',
              )}
            >
              {eyebrow}
            </Typography>
          )}

          <Typography
            as="h1"
            variant="page-title"
            className={cn(
              'mt-[clamp(0.5rem,2vw,0.75rem)]',
              'font-semibold',
              'tracking-[-0.04em]',
              'text-white',
            )}
          >
            {title}
          </Typography>

          {description && (
            <Typography
              as="p"
              variant="body"
              className={cn(
                'mt-[clamp(0.75rem,3vw,1rem)]',
                'leading-[1.55]',
                'text-zinc-500',
              )}
            >
              {description}
            </Typography>
          )}
        </div>

        {children}

        {footer && (
          <div
            className={cn(
              'border-t border-white/[0.07]',
              'mt-[clamp(1.25rem,4vw,2rem)]',
              'pt-[clamp(1rem,4vw,1.5rem)]',
            )}
          >
            {footer}
          </div>
        )}
      </div>
    </div>

    {caption && (
      <Typography
        as="p"
        variant="caption"
        className={cn(
          'mt-[1.25rem]',
          'hidden sm:block',
          'text-center',
          'font-mono uppercase',
          'tracking-[0.12em]',
          'text-zinc-700',
        )}
      >
        {caption}
      </Typography>
    )}
  </div>
);
