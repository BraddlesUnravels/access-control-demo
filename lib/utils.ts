import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const isAzureEnv = (): boolean =>
  !!(
    process.env.CONTAINER_APP_NAME && process.env.CONTAINER_APP_ENV_DNS_SUFFIX
  );
