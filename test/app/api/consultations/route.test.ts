import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/admin/consultations/route';
import { requireAuthContext } from '@/lib/server/auth';
import { serverRequestClient } from '@/lib/supabase/server';
import { buildConsultation } from '@/test/fixtures/consultation';

vi.mock('@/lib/server/auth', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/server/auth')>(
      '@/lib/server/auth',
    );

  return { ...actual, requireAuthContext: vi.fn() };
});

vi.mock('@/lib/supabase/server', () => ({
  serverRequestClient: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn() },
}));

const EMPTY_CONTEXT = { params: Promise.resolve({}) };
const buildRequest = () =>
  new Request('http://localhost/api/admin/consultations', { method: 'GET' });

const setupGetMock = (data: unknown, error: unknown = null) => {
  const order = vi.fn().mockResolvedValue({ data, error });
  const select = vi.fn(() => ({ order }));
  const from = vi.fn(() => ({ select }));

  vi.mocked(serverRequestClient).mockResolvedValue({ from } as never);

  return { from, select, order };
};

describe('GET /api/admin/consultations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuthContext).mockResolvedValue({
      role: 'admin',
      userId: 'admin-1',
    });
  });

  it('should return all consultations for an administrator', async () => {
    const consultations = [
      buildConsultation(),
      buildConsultation({
        id: 'consultation-2',
        student_user_id: 'student-2',
      }),
    ];
    const { from, select, order } = setupGetMock(consultations);

    const response = await GET(buildRequest(), EMPTY_CONTEXT);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: consultations });
    expect(from).toHaveBeenCalledWith('consultations');
    expect(select).toHaveBeenCalledWith('*');
    expect(order).toHaveBeenCalledWith('scheduled_for', { ascending: true });
  });

  it('should return 403 for a student without querying consultations', async () => {
    vi.mocked(requireAuthContext).mockResolvedValue({
      role: 'student',
      userId: 'student-1',
    });

    const response = await GET(buildRequest(), EMPTY_CONTEXT);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(serverRequestClient).not.toHaveBeenCalled();
  });
});
