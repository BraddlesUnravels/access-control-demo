import { forwardRef, type HTMLAttributes } from 'react';
import { Typography } from './typography';
import { cn } from '@/lib/utils';

/** Text Wrapper */
const CardTitle = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <Typography
    variant="component-title"
    ref={ref}
    className={cn('font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));

CardTitle.displayName = 'CardTitle';

/** Text Wrapper */
const CardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <Typography
    ref={ref}
    as="p"
    variant="body"
    className={cn('leading-6 text-zinc-500', className)}
    {...props}
  />
));

CardDescription.displayName = 'CardDescription';

// compenent wrappers below

const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl border border-white/8 bg-white/2.5 text-zinc-100 shadow-[0_24px_70px_rgba(0,0,0,0.24)] backdrop-blur-sm',
        className,
      )}
      {...props}
    />
  ),
);

Card.displayName = 'Card';

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 p-6', className)}
      {...props}
    />
  ),
);

CardHeader.displayName = 'CardHeader';

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  ),
);

CardContent.displayName = 'CardContent';

export { Card, CardHeader, CardTitle, CardDescription, CardContent };
