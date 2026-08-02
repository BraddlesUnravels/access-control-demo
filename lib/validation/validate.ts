import * as v from 'valibot';

type FieldErrors = Record<string, string[]>;

type ValidationSuccess<TOutput> = {
  success: true;
  data: TOutput;
};

type ValidationFailure = {
  success: false;
  errors: string[];
  fieldErrors: FieldErrors;
};

export type ValidationResult<TOutput> =
  ValidationSuccess<TOutput> | ValidationFailure;

export const validateWithSchema = <
  TSchema extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>,
>(
  schema: TSchema,
  input: unknown,
): ValidationResult<v.InferOutput<TSchema>> => {
  const result = v.safeParse(schema, input);

  if (result.success) {
    return {
      success: true,
      data: result.output,
    };
  }

  const flattenedIssues = v.flatten(result.issues);
  const errors = [
    ...(flattenedIssues.root ?? []),
    ...(flattenedIssues.other ?? []),
  ];
  const fieldErrors = Object.fromEntries(
    Object.entries(flattenedIssues.nested ?? {}).flatMap(
      ([field, messages]) => {
        if (!messages || messages.length === 0) {
          return [];
        }

        return [[field, [...messages]]];
      },
    ),
  ) as FieldErrors;

  return {
    success: false,
    errors,
    fieldErrors,
  };
};
