import {
  ACCESS_GATE_DEFAULT_DESTINATION,
  ACCESS_GATE_ENTRY_PATH,
  ACCESS_GATE_PUBLIC_PATHS,
  ACCESS_GATE_PUBLIC_PATH_PREFIXES,
} from './constants';
import { INTERNAL_ORIGIN } from '../validation/shared-constants';

export const isAccessGatePublicPath = (pathname: string): boolean => {
  const cleanPath = pathname.trim().toLowerCase();
  if (cleanPath === ACCESS_GATE_ENTRY_PATH) return true;

  if (ACCESS_GATE_PUBLIC_PATHS.some((path) => path === cleanPath)) return true;

  return ACCESS_GATE_PUBLIC_PATH_PREFIXES.some((prefix) => {
    return cleanPath === prefix || cleanPath.startsWith(`${prefix}/`);
  });
};

export const getSafeAccessGateDestination = (
  value: string | null | undefined,
): string => {
  if (!value || !value.startsWith('/') || value.startsWith('//'))
    return ACCESS_GATE_DEFAULT_DESTINATION;

  let destination: URL;

  try {
    destination = new URL(value, INTERNAL_ORIGIN);
  } catch {
    return ACCESS_GATE_DEFAULT_DESTINATION;
  }

  if (
    destination.origin !== INTERNAL_ORIGIN ||
    destination.pathname === ACCESS_GATE_ENTRY_PATH ||
    destination.pathname === '/api' ||
    destination.pathname.startsWith('/api/')
  ) {
    return ACCESS_GATE_DEFAULT_DESTINATION;
  }

  return `${destination.pathname}${destination.search}${destination.hash}`;
};
