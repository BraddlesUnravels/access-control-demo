import { createHmac } from 'node:crypto';

export const normalizeInviteCode = (code: string): string => {
  return code.trim().toUpperCase().replace(/\s+/g, '');
};

export const hashInviteCode = (code: string, secret: string): string => {
  return createHmac('sha256', secret)
    .update(normalizeInviteCode(code))
    .digest('hex');
};
