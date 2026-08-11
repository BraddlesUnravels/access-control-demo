import * as v from 'valibot';

const apiErrorPayloadSchema = v.object({
  error: v.string(),
});

export const readJsonResponse = async (
  response: Response,
): Promise<unknown | undefined> => {
  const responseContentType = response.headers.get('content-type') ?? '';
  const isJsonResponse = responseContentType.includes('application/json');

  if (!isJsonResponse) return undefined;

  try {
    const payload: unknown = await response.json();

    return payload;
  } catch {
    return undefined;
  }
};

export const getApiErrorMessage = (
  payload: unknown,
  fallbackMessage: string,
): string => {
  const result = v.safeParse(apiErrorPayloadSchema, payload);
  if (!result.success || !result.output.error) return fallbackMessage;

  return result.output.error;
};
