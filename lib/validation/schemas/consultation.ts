import * as v from 'valibot';
import {
  CONSULTATION_NAME_MAX_LENGTH,
  CONSULTATION_REASON_MAX_LENGTH,
} from '@/lib/validation/limits';
import { Constants } from '@/lib/supabase/database.types';
import { isIsoTimestamp } from '@/lib/validation/helpers';

const DATE_ERROR_MESSAGE = 'Scheduled time must be a valid date';

const requiredText = (label: string, maxLength: number) =>
  v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty(`${label} is required`),
    v.maxLength(
      maxLength,
      `${label} must be no more than ${maxLength} characters long`,
    ),
  );

const scheduledForSchema = v.pipe(
  v.string(),
  v.check((value) => isIsoTimestamp(value), DATE_ERROR_MESSAGE),
);

export const consultationStatusSchema = v.picklist([
  ...Constants.public.Enums.consultation_status,
]);

export const consultationCreateInputSchema = v.object({
  firstName: requiredText('First name', CONSULTATION_NAME_MAX_LENGTH),
  lastName: requiredText('Last name', CONSULTATION_NAME_MAX_LENGTH),
  reason: requiredText('Reason', CONSULTATION_REASON_MAX_LENGTH),
  scheduledFor: scheduledForSchema,
});
export const consultationUpdateInputSchema = v.pipe(
  v.object({
    scheduledFor: v.optional(scheduledForSchema),
    status: v.optional(v.picklist(['scheduled', 'completed'])),
  }),
  v.check(
    (value) =>
      typeof value.scheduledFor !== 'undefined' ||
      typeof value.status !== 'undefined',
    'At least one field is required: scheduledFor or status',
  ),
);
