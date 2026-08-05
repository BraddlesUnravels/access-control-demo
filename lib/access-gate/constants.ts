export const ACCESS_GATE_COOKIE_NAME = 'access_gate';

export const ACCESS_GATE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export const ACCESS_GATE_CONTACT_EMAIL = 'tidemaster2@gmail.com';

export const ACCESS_GATE_REQUEST_TOKENS_URL =
  'mailto:tidemaster2@gmail.com?subject=Access%20Control%20Demo%20-%20Request%20more%20invite%20tokens';

export const ACCESS_GATE_PUBLIC_PATH_PREFIXES = [
  '/access',
  '/api/access',
  '/api/health',
] as const;
