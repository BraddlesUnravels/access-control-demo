import React from 'react';

import { cn } from '@/lib/utils';

const inputStyles = [
  'flex h-11 w-full rounded-xl border border-white/[0.1] bg-black/25 px-3.5 py-1 text-base text-zinc-100 shadow-inner',
  'transition-[border-color,box-shadow,background-color]',
  'placeholder:text-zinc-700',
  'focus-visible:border-cyan-300/40 focus-visible:bg-black/30 focus-visible:outline-hidden',
  'focus-visible:ring-2 focus-visible:ring-cyan-300/10',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'md:text-sm',
].join(' ');

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputStyles, className)}
        ref={ref}
        {...props}
      />
    );
  },
);

Input.displayName = 'Input';

export { Input };
