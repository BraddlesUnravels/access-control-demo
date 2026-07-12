import * as v from 'valibot';

const profileIdSchema = v.pipe(v.string(), v.uuid('Profile id must be a valid UUID'));
const isoDateSchema = v.pipe(
  v.string(),
  v.isoTimestamp('Timestamp must be a valid ISO-8601 datetime'),
);

export const profileRoleSchema = v.picklist(['student', 'admin']);

export const profileSchema = v.object({
  id: profileIdSchema,
  role: profileRoleSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const profileCreateInputSchema = v.object({
  id: profileIdSchema,
  role: v.optional(profileRoleSchema),
});

export const profileUpdateInputSchema = v.object({
  role: v.optional(profileRoleSchema),
});
