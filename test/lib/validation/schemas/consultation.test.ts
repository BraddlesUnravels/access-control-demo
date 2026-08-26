import { describe, expect, it } from 'vitest';
import {
  CONSULTATION_NAME_MAX_LENGTH,
  CONSULTATION_REASON_MAX_LENGTH,
} from '@/lib/validation/limits';
import { consultationCreateInputSchema } from '@/lib/validation/schemas/consultation';
import { validateWithSchema } from '@/lib/validation/validate';

const VALID_INPUT = {
  firstName: 'Taylor',
  lastName: 'Nguyen',
  reason: 'Course planning',
  scheduledFor: '2026-08-20T02:00:00.000Z',
};

describe('consultationCreateInputSchema', () => {
  it('should accept text at the configured limits after trimming', () => {
    const result = validateWithSchema(consultationCreateInputSchema, {
      ...VALID_INPUT,
      firstName: `  ${'a'.repeat(CONSULTATION_NAME_MAX_LENGTH)}  `,
      lastName: `  ${'b'.repeat(CONSULTATION_NAME_MAX_LENGTH)}  `,
      reason: `  ${'c'.repeat(CONSULTATION_REASON_MAX_LENGTH)}  `,
    });

    expect(result.success).toBe(true);

    if (!result.success) return;

    expect(result.data.firstName).toHaveLength(CONSULTATION_NAME_MAX_LENGTH);
    expect(result.data.lastName).toHaveLength(CONSULTATION_NAME_MAX_LENGTH);
    expect(result.data.reason).toHaveLength(CONSULTATION_REASON_MAX_LENGTH);
  });

  it.each([
    {
      field: 'firstName',
      value: 'a'.repeat(CONSULTATION_NAME_MAX_LENGTH + 1),
      message: `First name must be no more than ${CONSULTATION_NAME_MAX_LENGTH} characters long`,
    },
    {
      field: 'lastName',
      value: 'b'.repeat(CONSULTATION_NAME_MAX_LENGTH + 1),
      message: `Last name must be no more than ${CONSULTATION_NAME_MAX_LENGTH} characters long`,
    },
    {
      field: 'reason',
      value: 'c'.repeat(CONSULTATION_REASON_MAX_LENGTH + 1),
      message: `Reason must be no more than ${CONSULTATION_REASON_MAX_LENGTH} characters long`,
    },
  ] as const)(
    'should reject an oversized $field',
    ({ field, value, message }) => {
      const result = validateWithSchema(consultationCreateInputSchema, {
        ...VALID_INPUT,
        [field]: value,
      });

      expect(result.success).toBe(false);

      if (result.success) return;

      expect(result.fieldErrors[field]).toEqual([message]);
    },
  );
});
