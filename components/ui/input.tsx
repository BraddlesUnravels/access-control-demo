import React, { useState } from 'react';
import { Eye, EyeClosed } from 'lucide-react';
import { cn } from '@/lib/utils';

type InputProps = React.ComponentProps<'input'> & {
  endIcon?: React.ReactNode;
};

const inputStyles = [
  'flex h-11 w-full rounded-xl border border-white/[0.1] bg-black/25 px-3.5 py-1 text-base text-zinc-100 shadow-inner',
  'transition-[border-color,box-shadow,background-color]',
  'placeholder:text-zinc-700',
  'focus-visible:border-cyan-300/40 focus-visible:bg-black/30 focus-visible:outline-hidden',
  'focus-visible:ring-2 focus-visible:ring-cyan-300/10',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'md:text-sm',
].join(' ');

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, endIcon, ...props }, ref) => {
    return (
      <div className="relative">
        <input
          type={type}
          className={cn(inputStyles, className)}
          ref={ref}
          {...props}
        />
        {endIcon && (
          <div
            className="absolute inset-y-0 right-3 flex items-center text-zinc-500"
            aria-hidden="true"
          >
            {endIcon}
          </div>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export { Input };

const PasswordInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    const [hidden, setHidden] = useState(true);

    return (
      <div className="relative">
        <input
          type={hidden ? 'password' : 'text'}
          className={cn(inputStyles, className)}
          ref={ref}
          {...props}
        />

        <button
          type="button"
          className="absolute inset-y-0 right-3 flex items-center text-zinc-500 transition-colors hover:cursor-pointer hover:text-zinc-400"
          onClick={() => setHidden((previous) => !previous)}
          aria-label={hidden ? 'Show password' : 'Hide password'}
        >
          {hidden ? (
            <Eye className="size-5" aria-hidden="true" />
          ) : (
            <EyeClosed className="size-5" aria-hidden="true" />
          )}
        </button>
      </div>
    );
  },
);

PasswordInput.displayName = 'PasswordInput';

export { PasswordInput };
