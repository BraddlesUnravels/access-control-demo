import { isAzureEnv } from '@/lib/utils';

// Do not trust `x-forwarded-for` header outside Azure
// Microsoft says the rightmost address is the client IP, others are proxies
// https://learn.microsoft.com/en-gb/azure/container-apps/ingress-overview

const NON_AZURE_CLIENT = 'non-azure-client';
const UNKNOWN_AZURE_CLIENT = 'unknown-azure-client';

const getRightmostForwardedAddress = (
  forwardedFor: string | null,
): string | undefined => {
  if (!forwardedFor) return UNKNOWN_AZURE_CLIENT;

  const addresses = forwardedFor
    .split(',')
    .map((address) => address.trim())
    .filter(Boolean);

  return addresses.at(-1);
};

export const getClientIdentifier = (request: Request): string => {
  if (!isAzureEnv()) return NON_AZURE_CLIENT;

  return (
    getRightmostForwardedAddress(request.headers.get('x-forwarded-for')) ??
    UNKNOWN_AZURE_CLIENT
  );
};
