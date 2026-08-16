import * as v from 'valibot';
import { LoginInputSchema, SignUpInputSchema } from '../schemas/auth';

export type LoginInput = v.InferOutput<typeof LoginInputSchema>;
export type SignUpInput = v.InferOutput<typeof SignUpInputSchema>;
