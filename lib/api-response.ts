type ApiErrorPayload = {
  error?: unknown;
};

export const readJsonResponse = async <TPayload>(response: Response) => {
  const responseContentType = response.headers.get('content-type') ?? '';
  const isJsonResponse = responseContentType.includes('application/json');

  if (!isJsonResponse) return undefined;

  try {
    return (await response.json()) as TPayload;
  } catch {
    return undefined;
  }
};

export const getApiErrorMessage = (
  payload: ApiErrorPayload | undefined,
  fallbackMessage: string,
) => {
  if (!payload || typeof payload.error !== 'string') return fallbackMessage;
  if (!payload.error) return fallbackMessage;

  return payload.error;
};
