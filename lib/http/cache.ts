export const PRIVATE_RESPONSE_CACHE_CONTROL =
  'private, no-store, max-age=0, must-revalidate';

export const markPrivateResponse = <T extends Response>(response: T): T => {
  if (!response.headers.has('Cache-Control')) {
    response.headers.set('Cache-Control', PRIVATE_RESPONSE_CACHE_CONTROL);
  }

  return response;
};
