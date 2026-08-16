import * as v from 'valibot';
import { LoginInputSchema } from '../schemas/auth';

export type LoginInput = v.InferOutput<typeof LoginInputSchema>;
