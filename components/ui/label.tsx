'use client';

import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';

const styles =
  'text-label uppercase font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70';

const Label = React.forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={styles} {...props} />
));

Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
