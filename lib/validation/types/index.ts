import * as v from 'valibot';
import {
  consultationStatusSchema,
  consultationCreateInputSchema,
  consultationUpdateInputSchema,
  profileRoleSchema,
  profileSchema,
  profileCreateInputSchema,
  profileUpdateInputSchema,
} from '../schemas';

export type ConsultationStatus = v.InferOutput<typeof consultationStatusSchema>;
export type ConsultationCreateInput = v.InferOutput<typeof consultationCreateInputSchema>;
export type ConsultationUpdateInput = v.InferOutput<typeof consultationUpdateInputSchema>;

export type ProfileRole = v.InferOutput<typeof profileRoleSchema>;
export type Profile = v.InferOutput<typeof profileSchema>;
export type ProfileCreateInput = v.InferOutput<typeof profileCreateInputSchema>;
export type ProfileUpdateInput = v.InferOutput<typeof profileUpdateInputSchema>;
