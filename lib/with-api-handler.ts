import { NextResponse } from 'next/server';
import { isAppError } from '@/lib/errors';
import { logger } from '@/lib/logger';

const UNAUTHENTICATED_ERROR = 'Unauthenticated';
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
        url: request.url,
      };

      // 1. Handle Unauthenticated
      if (error instanceof Error && error.message === UNAUTHENTICATED_ERROR) {
        logger.warn({ err: error, ...requestMeta }, 'Unauthorized request');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // 2. Handle Known Application Errors
      if (isAppError(error)) {
        logger.warn(
          { err: error, status: error.status, meta: error.meta, ...requestMeta },
          'Handled application error',
        );
        return NextResponse.json({ error: error.safeMessage }, { status: error.status });
      }

      // 3. Handle Unexpected Errors
      logger.error({ err: error, ...requestMeta }, 'Unhandled error at API boundary');
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}
