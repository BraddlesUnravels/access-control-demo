import * as v from 'valibot';
import {
  NEW_PASSWORD_MAX_LENGTH,
  NEW_PASSWORD_MIN_LENGTH,
} from '@/lib/validation/limits';

const EmailSchema = v.pipe(
  v.string(),
  v.trim(),
  v.nonEmpty('Email is required'),
  v.email('Please enter a valid email address'),
  v.maxLength(254, 'Email must be no more than 254 characters long'),
);

const PasswordSchema = v.pipe(v.string(), v.nonEmpty('Password is required'));

const NewPasswordSchema = v.pipe(
  v.string(),
  v.nonEmpty('Password is required'),
  v.minLength(
    NEW_PASSWORD_MIN_LENGTH,
    `Password must be at least ${NEW_PASSWORD_MIN_LENGTH} characters long`,
  ),
  v.maxLength(
    NEW_PASSWORD_MAX_LENGTH,
    `Password must be no more than ${NEW_PASSWORD_MAX_LENGTH} characters long`,
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
    password: NewPasswordSchema,
    repeatPassword: NewPasswordSchema,
  }),
  v.check(
    ({ password, repeatPassword }) => password === repeatPassword,
    'Passwords do not match',
  ),
);

export const SignUpInputSchema = v.pipe(
  v.object({
    email: EmailSchema,
    password: NewPasswordSchema,
    repeatPassword: NewPasswordSchema,
  }),
  v.check(
    ({ password, repeatPassword }) => password === repeatPassword,
    'Passwords do not match',
  ),
);
