import * as v from 'valibot';

export const accessUnlockInputSchema = v.object({
  code: v.pipe(
    v.optional(v.string(), ''),
    v.trim(),
    v.nonEmpty('Invite code is required'),
    v.minLength(6, 'Invite code is invalid'),
    v.maxLength(64, 'Invite code is invalid'),
  ),
});
