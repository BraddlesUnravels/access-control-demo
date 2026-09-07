import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/demo-accounts/route';
import { logger } from '@/lib/logger';

vi.mock('next/server', async () => {
  const actual =
    await vi.importActual<typeof import('next/server')>('next/server');

  return {
    ...actual,
    connection: vi.fn(),
  };
});

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

const buildRequest = () =>
  new Request('http://localhost/api/demo-accounts', { method: 'GET' });

describe('GET /api/demo-accounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return demo account data with a private no-store response', async () => {
    const response = await GET(buildRequest(), { params: Promise.resolve({}) });

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe(
      'private, no-store, max-age=0, must-revalidate',
    );
    await expect(response.json()).resolves.toMatchObject({
      accounts: expect.any(Array),
    });
  });

  it('should return a safe 500 and logs unexpected route failures', async () => {
    vi.mocked((await import('next/server')).connection).mockRejectedValue(
      new Error('connection failed'),
    );

    const response = await GET(buildRequest(), { params: Promise.resolve({}) });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Internal server error',
    });
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        path: '/api/demo-accounts',
      }),
      'Unhandled error at API boundary',
    );
  });
});
