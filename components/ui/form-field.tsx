import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { Typography } from '@/components/ui/typography';
import { cn } from '@/lib/utils';

type FormFieldProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  htmlFor: string;
  label: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  labelClassName?: string;
};

export const FormField = ({
  htmlFor,
  label,
  action,
  children,
  className,
  labelClassName,
  ...props
}: FormFieldProps) => (
  <div className={cn('grid gap-2', className)} {...props}>
    <div className="flex items-center justify-between gap-3">
      <Typography as="label" htmlFor={htmlFor} className={labelClassName}>
        {label}
      </Typography>

      {action}
    </div>

    {children}
  </div>
);
