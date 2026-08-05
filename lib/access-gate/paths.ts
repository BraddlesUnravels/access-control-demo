import { ACCESS_GATE_PUBLIC_PATH_PREFIXES } from '@/lib/access-gate/constants';

export const isAccessGatePublicPath = (pathname: string): boolean => {
  return ACCESS_GATE_PUBLIC_PATH_PREFIXES.some((prefix) => {
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
};
