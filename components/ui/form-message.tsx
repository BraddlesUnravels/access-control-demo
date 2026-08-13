import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/utils';

type FormMessageVariant = 'error' | 'success' | 'info';

type FormMessageProps = ComponentPropsWithoutRef<'div'> & {
  variant?: FormMessageVariant;
};

const variantStyles: Record<FormMessageVariant, string> = {
  error: 'border-destructive/15 bg-destructive/[0.06] text-red-300',
  success: 'border-emerald-400/15 bg-emerald-400/[0.06] text-emerald-300',
  info: 'border-white/[0.08] bg-white/[0.025] text-zinc-400',
};

export const FormMessage = ({
  variant = 'error',
  className,
  ...props
}: FormMessageProps) => (
  <div
    role={variant === 'error' ? 'alert' : 'status'}
    className={cn(
      'rounded-lg border px-3.5 py-3 text-xs leading-5',
      variantStyles[variant],
      className,
    )}
    {...props}
  />
);
