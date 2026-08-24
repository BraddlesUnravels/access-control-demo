import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Skeleton = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('animate-pulse rounded-md bg-white/[0.06]', className)}
    {...props}
  />
);
