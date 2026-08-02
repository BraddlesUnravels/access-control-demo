import * as v from 'valibot';
import {
  consultationCreateInputSchema,
  consultationStatusSchema,
  consultationUpdateInputSchema,
} from '../schemas/consultation';

export type ConsultationStatus = v.InferOutput<typeof consultationStatusSchema>;
export type ConsultationCreateInput = v.InferOutput<
  typeof consultationCreateInputSchema
>;
export type ConsultationUpdateInput = v.InferOutput<
  typeof consultationUpdateInputSchema
>;
export type ConsultationRecord = {
  id: string;
  student_user_id: string;
  first_name: string;
  last_name: string;
  reason: string;
  scheduled_for: string;
  status: ConsultationStatus;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
};
export type CreateConsultationForm = {
  firstName: string;
  lastName: string;
  reason: string;
  scheduledFor: string;
};
