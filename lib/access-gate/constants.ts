export const ACCESS_GATE_COOKIE_NAME = 'access_gate';

export const ACCESS_GATE_ENTRY_PATH = '/';

export const TOKEN_TTL_FROM_FIRST_USE = 1000 * 60 * 60 * 24 * 14; // 14 days

export const ACCESS_GATE_DEFAULT_DESTINATION = '/auth/login';

export const ACCESS_GATE_CONTACT_EMAIL = 'stackchatr@gmail.com';

export const ACCESS_GATE_REQUEST_TOKENS_URL = `mailto:${ACCESS_GATE_CONTACT_EMAIL}?subject=Access%20Control%20Demo%20-%20Request%20more%20invite%20tokens`;

export const ACCESS_GATE_PUBLIC_PATH_PREFIXES = [
  '/api/access',
  '/api/health',
] as const;
