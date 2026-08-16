import * as v from 'valibot';

const EmailSchema = v.pipe(
  v.string(),
  v.trim(),
  v.nonEmpty('Email is required'),
  v.email('Please enter a valid email address'),
  v.maxLength(254, 'Email must be no more than 254 characters long'),
);

const PasswordSchema = v.pipe(
  v.string(),
  v.nonEmpty('Password is required'),
  v.minLength(8, 'Password must be at least 8 characters long'),
  v.maxLength(32, 'Password must be no more than 32 characters long'),
  v.regex(/[a-z]/, 'Password must contain at least one lowercase letter'),
  v.regex(/[A-Z]/, 'Password must contain at least one uppercase letter'),
  v.regex(/[0-9]/, 'Password must contain at least one number'),
  v.regex(
    /[^A-Za-z0-9]/,
    'Password must contain at least one special character',
  ),
);

export const LoginInputSchema = v.object({
  email: EmailSchema,
  password: PasswordSchema,
});

export const PasswordResetRequestSchema = v.object({
  email: EmailSchema,
});

export const UpdatePasswordInputSchema = v.pipe(
  v.object({
    password: PasswordSchema,
    repeatPassword: PasswordSchema,
  }),
  v.check(
    ({ password, repeatPassword }) => password === repeatPassword,
    'Passwords do not match',
  ),
);
