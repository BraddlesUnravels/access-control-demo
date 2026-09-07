import { logger } from '@/lib/logger';

type ServerAction = (...args: never[]) => Promise<unknown>;

type RedirectError = {
  digest?: unknown;
};

const isRedirectError = (error: unknown): error is RedirectError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    typeof error.digest === 'string' &&
    error.digest.startsWith('NEXT_REDIRECT')
  );
};

export const withServerAction = <TAction extends ServerAction>(
  actionName: string,
  action: TAction,
): TAction => {
  return (async (...args: Parameters<TAction>) => {
    try {
      return await action(...args);
    } catch (error) {
      if (isRedirectError(error)) throw error;

      logger.error(
        {
          err: error,
          action: actionName,
        },
        'Unhandled error in server action',
      );

      throw error;
    }
  }) as TAction;
};
