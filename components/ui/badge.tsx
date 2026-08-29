import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors focus:outline-hidden focus:ring-2 focus:ring-cyan-300/15',
  {
    variants: {
      variant: {
        default:
          'border-cyan-300/15 bg-cyan-300/[0.07] text-cyan-200 hover:bg-cyan-300/10',

        secondary:
          'border-white/[0.07] bg-white/4 text-zinc-400 hover:bg-white/[0.07]',

        destructive:
          'border-red-400/15 bg-red-400/[0.07] text-red-300 hover:bg-red-400/10',

        outline: 'border-white/10 bg-transparent text-zinc-300',

        scheduled:
          'border-cyan-300/15 bg-cyan-300/[0.07] text-cyan-200 hover:bg-cyan-300/10',

        cancelled:
          'border-red-400/15 bg-red-400/[0.07] text-red-300 hover:bg-red-400/10',

        completed:
          'border-emerald-400/15 bg-emerald-400/[0.07] text-emerald-300 hover:bg-emerald-400/10',
      },
    },

    defaultVariants: {
      variant: 'default',
    },
  },
);

type BadgeProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof badgeVariants>;

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge };
