import type { DemoAccountId } from './demo-accounts';

export const STUDENT_1_DEMO_PASSWORD = 'ReviewStudent**01';
export const STUDENT_2_DEMO_PASSWORD = 'ReviewStudent**02';
export const ADMIN_DEMO_PASSWORD = 'ReviewAdmin**00';

export const DEMO_ACCOUNT_PASSWORDS = {
  'student-1': STUDENT_1_DEMO_PASSWORD,
  'student-2': STUDENT_2_DEMO_PASSWORD,
  admin: ADMIN_DEMO_PASSWORD,
} as const satisfies Record<DemoAccountId, string>;
