import { createHash } from 'node:crypto';

export const normalizeInviteCode = (code: string): string => {
  return code.trim().toUpperCase().replace(/\s+/g, '');
};

export const hashInviteCode = (code: string, secret: string): string => {
  const normalizedCode = normalizeInviteCode(code);

  return createHash('sha256')
    .update(`${secret}:${normalizedCode}`)
    .digest('hex');
};
