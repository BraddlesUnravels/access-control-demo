import * as v from 'valibot';

const DATE_ERROR_MESSAGE = 'Scheduled time must be a valid date';

const requiredText = (errorMessage: string) =>
  v.pipe(v.string(), v.trim(), v.nonEmpty(errorMessage));

const scheduledForSchema = v.pipe(
  v.string(),
  v.check((value) => !Number.isNaN(Date.parse(value)), DATE_ERROR_MESSAGE),
);

export const consultationStatusSchema = v.picklist([
  'scheduled',
  'completed',
  'cancelled',
]);

export const consultationCreateInputSchema = v.object({
  firstName: requiredText('First name is required'),
  lastName: requiredText('Last name is required'),
  reason: requiredText('Reason is required'),
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
