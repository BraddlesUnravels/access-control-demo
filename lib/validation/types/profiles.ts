import * as v from 'valibot';
import {
  profileRoleSchema,
  profileSchema,
  profileCreateInputSchema,
  profileUpdateInputSchema,
} from '../schemas/profiles';

export type ProfileRole = v.InferOutput<typeof profileRoleSchema>;
export type Profile = v.InferOutput<typeof profileSchema>;
export type ProfileCreateInput = v.InferOutput<typeof profileCreateInputSchema>;
export type ProfileUpdateInput = v.InferOutput<typeof profileUpdateInputSchema>;
