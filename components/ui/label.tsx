import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';

const styles =
  'text-label font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70';

const Label = React.forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className: classes = '', ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={[styles, classes].join(' ')}
    {...props}
  />
));

Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
