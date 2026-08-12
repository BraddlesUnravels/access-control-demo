import type { NextRequest } from 'next/server';

const LOCAL_APP_ORIGIN = 'http://localhost:3000';

const parseConfiguredAppOrigin = (value: string): string => {
  const url = new URL(value);

  if (
    (url.protocol !== 'http:' && url.protocol !== 'https:') ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      'Application origin must be an absolute HTTP(S) origin without a path.',
    );
  }

  return url.origin;
};

const getAzureAppOrigin = (): string | undefined => {
  const containerAppName = process.env.CONTAINER_APP_NAME?.trim();

  const environmentDnsSuffix = process.env.CONTAINER_APP_ENV_DNS_SUFFIX?.trim();

  if (!containerAppName || !environmentDnsSuffix) return;

  const customDomain = process.env.AZURE_CUSTOM_DOMAIN?.trim();

  if (customDomain) return parseConfiguredAppOrigin(`https://${customDomain}`);

  return parseConfiguredAppOrigin(
    `https://${containerAppName}.${environmentDnsSuffix}`,
  );
};

export const getAppOrigin = (request?: NextRequest): string => {
  const azureAppOrigin = getAzureAppOrigin();

  if (azureAppOrigin) return azureAppOrigin;

  if (request) return request.nextUrl.origin;

  return LOCAL_APP_ORIGIN;
};

export const buildAppUrl = (request: NextRequest, destination: string): URL => {
  return new URL(destination, `${getAppOrigin(request)}/`);
};
