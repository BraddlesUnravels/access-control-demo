import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/demo-accounts/route';
import { AppError } from '@/lib/errors';
import { requireAccessGateSession } from '@/lib/access-gate/require-session';
import { DEMO_ACCOUNTS } from '@/lib/demo-accounts';
import { DEMO_ACCOUNT_PASSWORDS } from '@/lib/demo-account-passwords';

vi.mock('next/server', async () => {
  const actual =
    await vi.importActual<typeof import('next/server')>('next/server');

  return { ...actual, connection: vi.fn().mockResolvedValue(undefined) };
});

vi.mock('@/lib/access-gate/require-session', () => ({
  requireAccessGateSession: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn() },
}));

describe('GET /api/demo-accounts', () => {
  const EMPTY_CONTEXT = { params: Promise.resolve({}) };
  const buildRequest = () =>
    new Request('http://localhost/api/demo-accounts', { method: 'GET' });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAccessGateSession).mockResolvedValue();
  });

  it('should return 401 when the access-gate session is invalid', async () => {
    vi.mocked(requireAccessGateSession).mockRejectedValue(
      new AppError('Access gate session is missing or invalid', {
        status: 401,
        safeMessage: 'Access invite is required.',
      }),
    );

    const response = await GET(buildRequest(), EMPTY_CONTEXT);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: 'Access invite is required.',
    });
  });

  it('should return the demo accounts with their passwords for a valid access-gate session', async () => {
    const response = await GET(buildRequest(), EMPTY_CONTEXT);

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe(
      'private, no-store, max-age=0, must-revalidate',
    );

    await expect(response.json()).resolves.toEqual({
      accounts: DEMO_ACCOUNTS.map((account) => ({
        ...account,
        password: DEMO_ACCOUNT_PASSWORDS[account.id],
      })),
    });
  });
});
