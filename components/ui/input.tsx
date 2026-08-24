import { useState, forwardRef, ComponentProps } from 'react';
import type { ReactNode } from 'react';
import { Eye, EyeClosed, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

type InputProps = ComponentProps<'input'> & {
  endIcon?: ReactNode;
  'show-button-tab-index'?: number;
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

const Input = forwardRef<HTMLInputElement, InputProps>(
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

const PasswordInput = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    const [hidden, setHidden] = useState(true);

    return (
      <div className="relative">
        <input
          aria-label="Password input field"
          type={hidden ? 'password' : 'text'}
          className={cn(inputStyles, className)}
          ref={ref}
          {...props}
        />

        <button
          id="show-password-button"
          name="show-password-button"
          tabIndex={props['show-button-tab-index']}
          type="button"
          className="absolute inset-y-0 right-3 flex items-center text-zinc-500 transition-colors hover:cursor-pointer hover:text-zinc-400"
          onClick={() => setHidden(!hidden)}
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

const DateTimeInput = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      disabled,
      onClick,
      'show-button-tab-index': pickerButtonTabIndex,
      ...props
    },
    ref,
  ) => {
    const showDateTimePicker = (input: HTMLInputElement) => {
      if (!input.disabled && typeof input.showPicker === 'function') {
        input.showPicker();
      }
    };
    return (
      <div className="relative">
        <input
          {...props}
          data-custom-picker="true"
          type="datetime-local"
          className={cn(inputStyles, 'cursor-pointer pr-11', className)}
          ref={ref}
          disabled={disabled}
          onClick={(event) => {
            onClick?.(event);
          }}
        />
        <button
          tabIndex={pickerButtonTabIndex}
          disabled={disabled}
          onClick={(event) => {
            const input = event.currentTarget.previousElementSibling;
            if (input instanceof HTMLInputElement) {
              showDateTimePicker(input);
            }
          }}
          type="button"
          className="absolute inset-y-0 right-3 flex items-center text-zinc-500 transition-colors hover:cursor-pointer hover:text-zinc-400 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Show date and time picker"
          aria-controls={typeof props.id === 'string' ? props.id : undefined}
        >
          <Calendar className="size-5" aria-hidden="true" />
        </button>
      </div>
    );
  },
);

DateTimeInput.displayName = 'DateTimeInput';

export { Input, PasswordInput, DateTimeInput };
