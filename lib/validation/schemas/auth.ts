import * as v from 'valibot';

export const loginInputSchema = v.object({
  email: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty('Email is required'),
    v.email('Email is invalid'),
  ),
  password: v.pipe(v.string(), v.nonEmpty('Password is required')),
});
