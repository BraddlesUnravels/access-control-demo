export const STUDENT_1_DEMO_PASSWORD = 'ReviewStudent**01';
export const STUDENT_2_DEMO_PASSWORD = 'ReviewStudent**02';
export const ADMIN_DEMO_PASSWORD = 'ReviewAdmin**00';

export const DEMO_ACCOUNTS = [
  {
    id: 'student-1',
    role: 'student',
    label: 'Student 01',
    email: 'student1@lms.com',
    password: STUDENT_1_DEMO_PASSWORD,
    scopeLabel: 'Own records',
    description:
      'Create, reschedule, complete, and cancel only this account’s consultations.',
  },
  {
    id: 'student-2',
    role: 'student',
    label: 'Student 02',
    email: 'student2@lms.com',
    password: STUDENT_2_DEMO_PASSWORD,
    scopeLabel: 'Own records',
    description:
      'Use a second student identity to see that one student cannot access another student’s records.',
  },
  {
    id: 'admin',
    role: 'admin',
    label: 'Administrator',
    email: 'admin@lms.com',
    password: ADMIN_DEMO_PASSWORD,
    scopeLabel: 'Read only',
    description:
      'View consultations across all student accounts without permission to edit them.',
  },
] as const;

export type DemoAccount = (typeof DEMO_ACCOUNTS)[number];

export type DemoAccountId = DemoAccount['id'];
