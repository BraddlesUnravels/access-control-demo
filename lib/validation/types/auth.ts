import * as v from 'valibot';
import { loginInputSchema } from '../schemas/auth';

export type LoginInput = v.InferOutput<typeof loginInputSchema>;
