import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-[color,background-color,border-color,box-shadow,transform] duration-200 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-cyan-300/15 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-r from-cyan-300 to-cyan-200 text-slate-950 shadow-[0_8px_28px_rgba(34,211,238,0.12)] hover:from-cyan-200 hover:to-cyan-100 hover:shadow-[0_10px_34px_rgba(34,211,238,0.2)]',

        destructive:
          'border border-red-400/15 bg-red-400/[0.08] text-red-300 hover:bg-red-400/[0.13]',

        outline:
          'border border-white/[0.1] bg-white/[0.025] text-zinc-300 shadow-sm hover:border-cyan-300/20 hover:bg-cyan-300/[0.055] hover:text-cyan-100',

        secondary:
          'border border-white/[0.07] bg-white/[0.055] text-zinc-300 hover:bg-white/[0.09] hover:text-zinc-100',

        ghost: 'text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-100',

        link: 'text-cyan-300 underline-offset-4 hover:text-cyan-200 hover:underline',
      },

      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-10 px-8',
        icon: 'h-9 w-9',
      },
    },

    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';

export { Button, buttonVariants };
