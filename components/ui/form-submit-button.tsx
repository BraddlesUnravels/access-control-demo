import type { ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';

type FormSubmitButtonProps = Omit<ButtonProps, 'type'> & {
  isLoading: boolean;
  loadingLabel: ReactNode;
};

export const FormSubmitButton = ({
  isLoading,
  loadingLabel,
  disabled,
  children,
  ...props
}: FormSubmitButtonProps) => (
  <Button
    type="submit"
    disabled={disabled || isLoading}
    aria-busy={isLoading || undefined}
    {...props}
  >
    {isLoading ? (
      <>
        <LoaderCircle className="animate-spin" aria-hidden="true" />
        {loadingLabel}
      </>
    ) : (
      children
    )}
  </Button>
);
