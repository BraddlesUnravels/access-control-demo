import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const isAzureEnv = (): boolean =>
  !!(
    process.env.CONTAINER_APP_NAME && process.env.CONTAINER_APP_ENV_DNS_SUFFIX
  );

export const getErrorMessage = (
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string => {
  if (error instanceof Error && error.message.trim()) return error.message;

  if (typeof error === 'string' && error.trim()) return error;

  return fallback;
};
