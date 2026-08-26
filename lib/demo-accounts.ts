import { DemoAccount } from './validation/types/demo-account';
export const DEMO_ACCOUNTS = [
  {
    id: 'student-1',
    role: 'student',
    label: 'Student 01',
    email: 'student1@lms.com',
    scopeLabel: 'Own records',
    description:
      'Create, reschedule, complete, and cancel only this account’s consultations.',
  },
  {
    id: 'student-2',
    role: 'student',
    label: 'Student 02',
    email: 'student2@lms.com',
    scopeLabel: 'Own records',
    description:
      'Use a second student identity to see that one student cannot access another student’s records.',
  },
  {
    id: 'admin',
    role: 'admin',
    label: 'Administrator',
    email: 'admin@lms.com',
    scopeLabel: 'Read only',
    description:
      'View consultations across all student accounts without permission to edit them.',
  },
] as const satisfies readonly DemoAccount[];

export type DemoAccountId = DemoAccount['id'];

export type DemoAccountWithPassword = DemoAccount & {
  password: string;
};
