import { isAzureEnv } from '../utils';

export const isAccessGateDisabled = (): boolean => {
  return process.env.ACCESS_GATE_DISABLED === 'true' && !isAzureEnv();
};

const MINIMUM_PRODUCTION_SECRET_LENGTH = 32;

const getRequiredSecret = (name: string): string => {
  const secret = process.env[name];

  if ((secret && secret.length < MINIMUM_PRODUCTION_SECRET_LENGTH) || !secret)
    throw new Error(
      `Environment variable ${name} is missing or does not meet length requirements \
      (minimum ${MINIMUM_PRODUCTION_SECRET_LENGTH} characters).`,
    );

  return secret;
};

export const getAccessGateCodeSecret = (): string => {
  return getRequiredSecret('ACCESS_GATE_CODE_SECRET');
};

export const getAccessGateCookieSecret = (): string => {
  return getRequiredSecret('ACCESS_GATE_COOKIE_SECRET');
};

export const tryGetAccessGateCookieSecret = (): string | undefined => {
  try {
    return getAccessGateCookieSecret();
  } catch {
    return undefined;
  }
};
