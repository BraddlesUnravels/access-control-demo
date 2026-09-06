export const ACCESS_GATE_COOKIE_NAME = 'access_gate';

export const ACCESS_GATE_ENTRY_PATH = '/';

export const ACCESS_GATE_DEFAULT_DESTINATION = '/auth/login';

export const ACCESS_GATE_CONTACT_EMAIL = 'bradley.laskey1990@gmail.com';

export const ACCESS_GATE_REQUEST_TOKENS_URL = `mailto:${ACCESS_GATE_CONTACT_EMAIL}?subject=Access%20Control%20Demo%20-%20Request%20more%20invite%20tokens`;

export const ACCESS_GATE_PUBLIC_PATHS = ['/api/access/unlock'] as const;

export const ACCESS_GATE_PUBLIC_PATH_PREFIXES = [
  '/api/health',
  '/auth/confirm',
  '/auth/confirm-email',
] as const;
