import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { withApiHandler } from '@/lib/with-api-handler';

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

const ROUTE_CONTEXT = {
  params: Promise.resolve({}),
};

const buildRequest = (url = 'http://localhost/api/test') =>
  new Request(url, {
    method: 'GET',
  });

describe('withApiHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should map a structured authentication error to its safe API response', async () => {
    const error = new AppError('Authentication required', {
      status: 401,
      safeMessage: 'Unauthorized',
    });

    const handler = withApiHandler(async () => {
      throw error;
    });

    const response = await handler(buildRequest(), ROUTE_CONTEXT);

    expect(response.status).toBe(401);

    await expect(response.json()).resolves.toEqual({
      error: 'Unauthorized',
    });

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        err: error,
        status: 401,
        method: 'GET',
        path: '/api/test',
      }),
      'Handled application error',
    );

    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should not infer authentication status from an error message', async () => {
    const error = new Error('Unauthenticated');

    const handler = withApiHandler(async () => {
      throw error;
    });

    const response = await handler(
      buildRequest('http://localhost/api/test?token=secret-value'),
      ROUTE_CONTEXT,
    );

    expect(response.status).toBe(500);

    await expect(response.json()).resolves.toEqual({
      error: 'Internal server error',
    });

    expect(logger.error).toHaveBeenCalledWith(
      {
        err: error,
        method: 'GET',
        path: '/api/test',
      },
      'Unhandled error at API boundary',
    );

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('should return successful handler responses unchanged', async () => {
    const handler = withApiHandler(async () =>
      NextResponse.json({ data: 'ok' }, { status: 200 }),
    );

    const response = await handler(buildRequest(), ROUTE_CONTEXT);

    expect(response.status).toBe(200);

    await expect(response.json()).resolves.toEqual({
      data: 'ok',
    });

    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });
});
