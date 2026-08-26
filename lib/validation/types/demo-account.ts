import * as v from 'valibot';
import { demoAccountResponseSchema } from '../schemas/demo-accounts';

export type DemoAccountId = 'student-1' | 'student-2' | 'admin';

export type DemoAccountRole = 'student' | 'admin';

export type DemoAccount = {
  readonly id: DemoAccountId;
  readonly role: DemoAccountRole;
  readonly label: string;
  readonly email: string;
  readonly scopeLabel: string;
  readonly description: string;
};

export type DemoAccountWithPassword = DemoAccount & {
  readonly password: string;
};

export type DemoAccountResponse = v.InferOutput<
  typeof demoAccountResponseSchema
>;
