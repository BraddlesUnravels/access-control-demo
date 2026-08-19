import { NextResponse } from 'next/server';
import { isAppError } from '@/lib/errors';
import { logger } from '@/lib/logger';

type RouteContext = { params: Promise<Record<string, string>> };

export function withApiHandler<TContext = RouteContext>(
  handler: (request: Request, context: TContext) => Promise<NextResponse>,
) {
  return async (request: Request, context: TContext) => {
    try {
      return await handler(request, context);
    } catch (error) {
      const requestMeta = {
        method: request.method,
        // strip query params for logging https://www.w3.org/TR/CSP3/#obtain-violation-blocked-uri
        path: new URL(request.url).pathname,
      };

      // 1. Handle Unauthenticated
      if (isAppError(error)) {
        logger.warn(
          {
            err: error,
            status: error.status,
            meta: error.meta,
            ...requestMeta,
          },
          'Handled application error',
        );

        return NextResponse.json(
          { error: error.safeMessage },
          { status: error.status },
        );
      }

      // 2. Handle Unexpected Errors
      logger.error(
        { err: error, ...requestMeta },
        'Unhandled error at API boundary',
      );

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 },
      );
    }
  };
}
