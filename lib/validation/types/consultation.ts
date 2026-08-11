import * as v from 'valibot';
import type { Enums, Tables } from '@/lib/supabase/database.types';
import {
  consultationCreateInputSchema,
  consultationUpdateInputSchema,
} from '../schemas/consultation';

export type ConsultationStatus = Enums<'consultation_status'>;

export type ConsultationCreateInput = v.InferOutput<
  typeof consultationCreateInputSchema
>;

export type ConsultationUpdateInput = v.InferOutput<
  typeof consultationUpdateInputSchema
>;

export type ConsultationRecord = Tables<'consultations'>;

export type CreateConsultationForm = {
  firstName: string;
  lastName: string;
  reason: string;
  scheduledFor: string;
};
