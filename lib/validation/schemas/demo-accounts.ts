import * as v from 'valibot';

export const demoAccountResponseSchema = v.object({
  accounts: v.array(
    v.object({
      id: v.picklist(['student-1', 'student-2', 'admin']),
      role: v.picklist(['student', 'admin']),
      label: v.string(),
      email: v.pipe(v.string(), v.email()),
      scopeLabel: v.string(),
      description: v.string(),
      password: v.pipe(v.string(), v.minLength(1)),
    }),
  ),
});
