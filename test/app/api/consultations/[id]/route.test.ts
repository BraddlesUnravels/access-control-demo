import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DELETE, PATCH } from '@/app/api/consultations/[id]/route';
import { requireAuthContext, type AuthContext } from '@/lib/server/auth';
import { serverRequestClient } from '@/lib/supabase/server';
import { buildConsultation } from '@/test/fixtures/consultation';
import type { ConsultationRecord } from '@/lib/validation/types';

const createAuthContext = (
  overrides: Pick<AuthContext, 'role' | 'userId'>,
): AuthContext => ({
  supabase: {} as AuthContext['supabase'],
  ...overrides,
});

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

const CONSULTATION_ID = '0197d2ee-6242-7616-8ef5-474ad0ecff0f';

const STUDENT_AUTH = createAuthContext({
  role: 'student',
  userId: 'student-1',
});
const ROUTE_CONTEXT = {
  params: Promise.resolve({ id: CONSULTATION_ID }),
};

const buildRequest = (method: 'PATCH' | 'DELETE', body?: string) =>
  new Request(`http://localhost/api/consultations/${CONSULTATION_ID}`, {
    method,
    body,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
  });

type SupabaseMockOptions = {
  existing?: ConsultationRecord | null;
  existingError?: unknown;
  updated?: ConsultationRecord | null;
  updateError?: unknown;
};

const setupSupabaseMock = ({
  existing = buildConsultation(),
  existingError = null,
  updated = buildConsultation(),
  updateError = null,
}: SupabaseMockOptions = {}) => {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: existing,
    error: existingError,
  });
  const ownedStudentEq = vi.fn(() => ({ maybeSingle }));
  const ownedIdEq = vi.fn(() => ({ eq: ownedStudentEq }));
  const ownedSelect = vi.fn(() => ({ eq: ownedIdEq }));

  const single = vi
    .fn()
    .mockResolvedValue({ data: updated, error: updateError });
  const updateSelect = vi.fn(() => ({ single }));
  const updateStudentEq = vi.fn(() => ({ select: updateSelect }));
  const updateIdEq = vi.fn(() => ({ eq: updateStudentEq }));
  const update = vi.fn(() => ({ eq: updateIdEq }));

  const from = vi.fn(() => ({ select: ownedSelect, update }));
  vi.mocked(serverRequestClient).mockResolvedValue({ from } as never);

  return {
    maybeSingle,
    ownedIdEq,
    ownedStudentEq,
    update,
    updateIdEq,
    updateStudentEq,
  };
};

describe('app/api/consultations/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuthContext).mockResolvedValue(STUDENT_AUTH);
  });

  describe('PATCH', () => {
    it('should return validation errors before querying Supabase', async () => {
      const response = await PATCH(
        buildRequest('PATCH', JSON.stringify({})),
        ROUTE_CONTEXT,
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        error: 'At least one field is required: scheduledFor or status',
      });
      expect(serverRequestClient).not.toHaveBeenCalled();
    });

    it('should return 404 when the student does not own the consultation', async () => {
      const { ownedIdEq, ownedStudentEq } = setupSupabaseMock({
        existing: null,
      });

      const response = await PATCH(
        buildRequest('PATCH', JSON.stringify({ status: 'completed' })),
        ROUTE_CONTEXT,
      );

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({
        error: 'Consultation was not found',
      });
      expect(ownedIdEq).toHaveBeenCalledWith('id', CONSULTATION_ID);
      expect(ownedStudentEq).toHaveBeenCalledWith(
        'student_user_id',
        'student-1',
      );
    });

    it('should reject update to a cancelled consultation', async () => {
      const { update } = setupSupabaseMock({
        existing: buildConsultation({ status: 'cancelled' }),
      });

      const response = await PATCH(
        buildRequest('PATCH', JSON.stringify({ status: 'completed' })),
        ROUTE_CONTEXT,
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: 'Cancelled consultations cannot be updated',
      });
      expect(update).not.toHaveBeenCalled();
    });

    it('should reject rescheduling a completed consultation', async () => {
      const { update } = setupSupabaseMock({
        existing: buildConsultation({ status: 'completed' }),
      });

      const response = await PATCH(
        buildRequest(
          'PATCH',
          JSON.stringify({ scheduledFor: '2026-08-21T04:00:00.000Z' }),
        ),
        ROUTE_CONTEXT,
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: 'Completed consultations cannot be rescheduled',
      });
      expect(update).not.toHaveBeenCalled();
    });

    it.each([
      ['completed', '2026-08-12T01:23:45.000Z'],
      ['scheduled', null],
    ] as const)(
      'should update status to %s without writing lifecycle timestamps in the API',
      async (status, completedAt) => {
        const { update, updateIdEq, updateStudentEq } = setupSupabaseMock({
          existing: buildConsultation({
            status: status === 'scheduled' ? 'completed' : 'scheduled',
          }),
          updated: buildConsultation({ status, completed_at: completedAt }),
        });

        const response = await PATCH(
          buildRequest('PATCH', JSON.stringify({ status })),
          ROUTE_CONTEXT,
        );

        expect(response.status).toBe(200);
        expect(update).toHaveBeenCalledWith({ status });
        expect(updateIdEq).toHaveBeenCalledWith('id', CONSULTATION_ID);
        expect(updateStudentEq).toHaveBeenCalledWith(
          'student_user_id',
          'student-1',
        );
      },
    );

    it('should reschedule an owned consultation', async () => {
      const scheduledFor = '2026-08-21T04:00:00.000Z';
      const { update } = setupSupabaseMock({
        updated: buildConsultation({ scheduled_for: scheduledFor }),
      });

      const response = await PATCH(
        buildRequest('PATCH', JSON.stringify({ scheduledFor })),
        ROUTE_CONTEXT,
      );

      expect(response.status).toBe(200);
      expect(update).toHaveBeenCalledWith({ scheduled_for: scheduledFor });
    });
  });

  describe('DELETE', () => {
    it('should return 404 when the student does not own the consultation', async () => {
      setupSupabaseMock({ existing: null });

      const response = await DELETE(buildRequest('DELETE'), ROUTE_CONTEXT);

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({
        error: 'Consultation was not found',
      });
    });

    it('should return an already-cancelled consultation without updating again', async () => {
      const cancelled = buildConsultation({
        status: 'cancelled',
        cancelled_at: '2026-08-11T04:00:00.000Z',
      });
      const { update } = setupSupabaseMock({ existing: cancelled });

      const response = await DELETE(buildRequest('DELETE'), ROUTE_CONTEXT);

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ data: cancelled });
      expect(update).not.toHaveBeenCalled();
    });

    it('should cancel a completed consultation', async () => {
      const completed = buildConsultation({ status: 'completed' });
      const cancelled = buildConsultation({ status: 'cancelled' });
      const { update, updateIdEq, updateStudentEq } = setupSupabaseMock({
        existing: completed,
        updated: cancelled,
      });

      const response = await DELETE(buildRequest('DELETE'), ROUTE_CONTEXT);

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ data: cancelled });
      expect(update).toHaveBeenCalledWith({ status: 'cancelled' });
      expect(updateIdEq).toHaveBeenCalledWith('id', CONSULTATION_ID);
      expect(updateStudentEq).toHaveBeenCalledWith(
        'student_user_id',
        'student-1',
      );
    });

    it('should cancel an owned consultation without writing lifecycle timestamps in the API', async () => {
      const cancelled = buildConsultation({
        status: 'cancelled',
      });
      const { update, updateIdEq, updateStudentEq } = setupSupabaseMock({
        updated: cancelled,
      });

      const response = await DELETE(buildRequest('DELETE'), ROUTE_CONTEXT);

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ data: cancelled });
      expect(update).toHaveBeenCalledWith({ status: 'cancelled' });
      expect(updateIdEq).toHaveBeenCalledWith('id', CONSULTATION_ID);
      expect(updateStudentEq).toHaveBeenCalledWith(
        'student_user_id',
        'student-1',
      );
    });
  });
});
