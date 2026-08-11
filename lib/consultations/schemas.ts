import * as v from 'valibot';
import { consultationStatusSchema } from '@/lib/validation/schemas';

const DATE_ERROR_MESSAGE = 'Consultation date must be a valid date';

const consultationDateSchema = v.pipe(
  v.string(),
  v.check((value) => !Number.isNaN(Date.parse(value)), DATE_ERROR_MESSAGE),
);

export const consultationRecordSchema = v.object({
  id: v.string(),
  student_user_id: v.string(),
  first_name: v.string(),
  last_name: v.string(),
  reason: v.string(),
  scheduled_for: consultationDateSchema,
  status: consultationStatusSchema,
  created_at: consultationDateSchema,
  updated_at: consultationDateSchema,
  completed_at: v.nullable(consultationDateSchema),
  cancelled_at: v.nullable(consultationDateSchema),
});

export const consultationResponseSchema = v.object({
  data: consultationRecordSchema,
});

export const consultationListResponseSchema = v.object({
  data: v.array(consultationRecordSchema),
});
