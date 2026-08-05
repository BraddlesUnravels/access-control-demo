export const isAccessGateDisabled = (): boolean => {
  return process.env.ACCESS_GATE_DISABLED === 'true';
};

export const getAccessGateSecret = (): string => {
  const secret = process.env.ACCESS_GATE_SECRET;

  if (!secret) {
    throw new Error('Environment variable ACCESS_GATE_SECRET is required.');
  }

  return secret;
};

export const tryGetAccessGateSecret = (): string | undefined => {
  const secret = process.env.ACCESS_GATE_SECRET;

  if (!secret) {
    return undefined;
  }

  return secret;
};
