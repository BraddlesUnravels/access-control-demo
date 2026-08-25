import { describe, expect, it } from 'vitest';
import {
  LoginInputSchema,
  SignUpInputSchema,
  UpdatePasswordInputSchema,
} from '@/lib/validation/schemas/auth';
import {
  NEW_PASSWORD_MAX_LENGTH,
  NEW_PASSWORD_MIN_LENGTH,
} from '@/lib/validation/limits';
import { validateWithSchema } from '@/lib/validation/validate';

const EMAIL = 'student@example.com';
const PASSPHRASE = 'correct horse battery staple';

describe('auth validation schemas', () => {
  describe('LoginInputSchema', () => {
    it('should accept an existing password that does not meet the current creation policy', () => {
      const result = validateWithSchema(LoginInputSchema, {
        email: EMAIL,
        password: 'legacy',
      });

      expect(result).toEqual({
        success: true,
        data: {
          email: EMAIL,
          password: 'legacy',
        },
      });
    });

    it('should reject an empty password', () => {
      const result = validateWithSchema(LoginInputSchema, {
        email: EMAIL,
        password: '',
      });

      expect(result.success).toBe(false);

      if (result.success) return;

      expect(result.fieldErrors.password).toEqual(['Password is required']);
    });
  });

  describe('SignUpInputSchema', () => {
    it('should accept a long passphrase without composition requirements', () => {
      const result = validateWithSchema(SignUpInputSchema, {
        email: EMAIL,
        password: PASSPHRASE,
        repeatPassword: PASSPHRASE,
      });

      expect(result.success).toBe(true);
    });

    it('should reject a new password below the minimum length', () => {
      const password = 'a'.repeat(NEW_PASSWORD_MIN_LENGTH - 1);

      const result = validateWithSchema(SignUpInputSchema, {
        email: EMAIL,
        password,
        repeatPassword: password,
      });

      expect(result.success).toBe(false);

      if (result.success) return;

      expect(result.fieldErrors.password).toEqual([
        `Password must be at least ${NEW_PASSWORD_MIN_LENGTH} characters long`,
      ]);
    });

    it('should reject a new password above the maximum length', () => {
      const password = 'a'.repeat(NEW_PASSWORD_MAX_LENGTH + 1);

      const result = validateWithSchema(SignUpInputSchema, {
        email: EMAIL,
        password,
        repeatPassword: password,
      });

      expect(result.success).toBe(false);

      if (result.success) return;

      expect(result.fieldErrors.password).toEqual([
        `Password must be no more than ${NEW_PASSWORD_MAX_LENGTH} characters long`,
      ]);
    });

    it('should reject mismatched passwords', () => {
      const result = validateWithSchema(SignUpInputSchema, {
        email: EMAIL,
        password: PASSPHRASE,
        repeatPassword: `${PASSPHRASE} extra`,
      });

      expect(result.success).toBe(false);

      if (result.success) return;

      expect(result.errors).toEqual(['Passwords do not match']);
    });
  });

  describe('UpdatePasswordInputSchema', () => {
    it('should use the same policy for password changes', () => {
      const result = validateWithSchema(UpdatePasswordInputSchema, {
        password: PASSPHRASE,
        repeatPassword: PASSPHRASE,
      });

      expect(result.success).toBe(true);
    });
  });
});
