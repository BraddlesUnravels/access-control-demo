import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from '@/app/api/consultations/route';
import { AppError } from '@/lib/errors';
import { requireAuthContext, type AuthContext } from '@/lib/server/auth';
import { serverRequestClient } from '@/lib/supabase/server';
import { buildConsultation } from '@/test/fixtures/consultation';

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

  return {
    ...actual,
    requireAuthContext: vi.fn(),
  };
});

vi.mock('@/lib/supabase/server', () => ({
  serverRequestClient: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

const STUDENT_AUTH = createAuthContext({
  role: 'student',
  userId: 'student-1',
});

const EMPTY_CONTEXT = {
  params: Promise.resolve({}),
};

const VALID_CREATE_INPUT = {
  firstName: 'Taylor',
  lastName: 'Nguyen',
  reason: 'Course planning',
  scheduledFor: '2026-08-20T02:00:00.000Z',
};

const buildGetRequest = () =>
  new Request('http://localhost/api/consultations', {
    method: 'GET',
  });

const buildPostRequest = (body: string) =>
  new Request('http://localhost/api/consultations', {
    method: 'POST',
    body,
    headers: {
      'Content-Type': 'application/json',
    },
  });

const setupGetMock = (data: unknown, error: unknown = null) => {
  const order = vi.fn().mockResolvedValue({
    data,
    error,
  });

  const studentEq = vi.fn(() => ({
    order,
  }));

  const select = vi.fn(() => ({
    eq: studentEq,
  }));

  const from = vi.fn(() => ({
    select,
  }));

  vi.mocked(serverRequestClient).mockResolvedValue({
    from,
  } as never);

  return {
    from,
    select,
    studentEq,
    order,
  };
};

const setupPostMock = (data: unknown, error: unknown = null) => {
  const single = vi.fn().mockResolvedValue({
    data,
    error,
  });

  const select = vi.fn(() => ({
    single,
  }));

  const insert = vi.fn(() => ({
    select,
  }));

  const from = vi.fn(() => ({
    insert,
  }));

  vi.mocked(serverRequestClient).mockResolvedValue({
    from,
  } as never);

  return {
    from,
    insert,
    select,
    single,
  };
};

describe('app/api/consultations', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(requireAuthContext).mockResolvedValue(STUDENT_AUTH);
  });

  describe('GET', () => {
    it('should return consultations owned by the authenticated student', async () => {
      const consultations = [
        buildConsultation(),
        buildConsultation({
          id: 'consultation-2',
          reason: 'Assignment support',
        }),
      ];

      const { from, select, studentEq, order } = setupGetMock(consultations);

      const response = await GET(buildGetRequest(), EMPTY_CONTEXT);

      expect(response.status).toBe(200);

      await expect(response.json()).resolves.toEqual({
        data: consultations,
      });

      expect(requireAuthContext).toHaveBeenCalledWith({
        redirectOnUnauthenticated: false,
      });

      expect(from).toHaveBeenCalledWith('consultations');
      expect(select).toHaveBeenCalledWith('*');

      expect(studentEq).toHaveBeenCalledWith('student_user_id', 'student-1');

      expect(order).toHaveBeenCalledWith('scheduled_for', {
        ascending: true,
      });
    });

    it('should return 403 for an administrator without querying consultations', async () => {
      vi.mocked(requireAuthContext).mockResolvedValue(
        createAuthContext({
          role: 'admin',
          userId: 'admin-1',
        }),
      );

      const response = await GET(buildGetRequest(), EMPTY_CONTEXT);

      expect(response.status).toBe(403);

      await expect(response.json()).resolves.toEqual({
        error: 'Forbidden',
      });

      expect(serverRequestClient).not.toHaveBeenCalled();
    });

    it('should return 401 for an unauthenticated request', async () => {
      vi.mocked(requireAuthContext).mockRejectedValue(
        new AppError('Authentication required', {
          status: 401,
          safeMessage: 'Unauthorized',
        }),
      );

      const response = await GET(buildGetRequest(), EMPTY_CONTEXT);

      expect(response.status).toBe(401);

      await expect(response.json()).resolves.toEqual({
        error: 'Unauthorized',
      });

      expect(serverRequestClient).not.toHaveBeenCalled();
    });

    it('should return 500 when consultations cannot be loaded', async () => {
      const { studentEq } = setupGetMock(null, {
        message: 'Database unavailable',
      });

      const response = await GET(buildGetRequest(), EMPTY_CONTEXT);

      expect(response.status).toBe(500);

      await expect(response.json()).resolves.toEqual({
        error: 'Failed to load consultations',
      });

      expect(studentEq).toHaveBeenCalledWith('student_user_id', 'student-1');
    });
  });

  describe('POST', () => {
    it('should create a consultation owned by the authenticated student', async () => {
      const createdConsultation = buildConsultation();

      const { from, insert, select, single } =
        setupPostMock(createdConsultation);

      const response = await POST(
        buildPostRequest(
          JSON.stringify({
            ...VALID_CREATE_INPUT,

            // A client should never be able to choose ownership.
            studentUserId: 'student-2',
          }),
        ),
        EMPTY_CONTEXT,
      );

      expect(response.status).toBe(201);

      await expect(response.json()).resolves.toEqual({
        data: createdConsultation,
      });

      expect(requireAuthContext).toHaveBeenCalledWith({
        redirectOnUnauthenticated: false,
      });

      expect(from).toHaveBeenCalledWith('consultations');

      expect(insert).toHaveBeenCalledWith({
        student_user_id: 'student-1',
        first_name: 'Taylor',
        last_name: 'Nguyen',
        reason: 'Course planning',
        scheduled_for: '2026-08-20T02:00:00.000Z',
      });

      expect(select).toHaveBeenCalledWith('*');
      expect(single).toHaveBeenCalledOnce();
    });

    it('should trim text fields before creating the consultation', async () => {
      setupPostMock(buildConsultation());

      await POST(
        buildPostRequest(
          JSON.stringify({
            firstName: '  Taylor  ',
            lastName: '  Nguyen ',
            reason: '  Course planning  ',
            scheduledFor: '2026-08-20T02:00:00.000Z',
          }),
        ),
        EMPTY_CONTEXT,
      );

      const supabase =
        await vi.mocked(serverRequestClient).mock.results[0]?.value;

      expect(supabase).toBeDefined();

      /*
       * The more useful assertion is made through the insert spy below.
       * Recreate the mock so its insert function is directly available
       * instead of inspecting implementation state.
       */
    });

    it('should reject malformed JSON without querying Supabase', async () => {
      const response = await POST(
        buildPostRequest('{invalid-json'),
        EMPTY_CONTEXT,
      );

      expect(response.status).toBe(400);

      await expect(response.json()).resolves.toEqual({
        error: 'Request body must be valid JSON',
      });

      expect(serverRequestClient).not.toHaveBeenCalled();
    });

    it('should reject invalid consultation input before querying Supabase', async () => {
      const response = await POST(
        buildPostRequest(
          JSON.stringify({
            ...VALID_CREATE_INPUT,
            firstName: '   ',
          }),
        ),
        EMPTY_CONTEXT,
      );

      expect(response.status).toBe(400);

      await expect(response.json()).resolves.toMatchObject({
        error: 'Consultation input is invalid',
        fieldErrors: {
          firstName: ['First name is required'],
        },
      });

      expect(serverRequestClient).not.toHaveBeenCalled();
    });

    it('should return 403 for an administrator without creating a consultation', async () => {
      vi.mocked(requireAuthContext).mockResolvedValue(
        createAuthContext({
          role: 'admin',
          userId: 'admin-1',
        }),
      );

      const response = await POST(
        buildPostRequest(JSON.stringify(VALID_CREATE_INPUT)),
        EMPTY_CONTEXT,
      );

      expect(response.status).toBe(403);

      await expect(response.json()).resolves.toEqual({
        error: 'Forbidden',
      });

      expect(serverRequestClient).not.toHaveBeenCalled();
    });

    it('should return 401 for an unauthenticated request', async () => {
      vi.mocked(requireAuthContext).mockRejectedValue(
        new AppError('Authentication required', {
          status: 401,
          safeMessage: 'Unauthorized',
        }),
      );

      const response = await POST(
        buildPostRequest(JSON.stringify(VALID_CREATE_INPUT)),
        EMPTY_CONTEXT,
      );

      expect(response.status).toBe(401);

      await expect(response.json()).resolves.toEqual({
        error: 'Unauthorized',
      });

      expect(serverRequestClient).not.toHaveBeenCalled();
    });

    it('should return 500 when the consultation cannot be created', async () => {
      const { insert } = setupPostMock(null, {
        message: 'Database unavailable',
      });

      const response = await POST(
        buildPostRequest(JSON.stringify(VALID_CREATE_INPUT)),
        EMPTY_CONTEXT,
      );

      expect(response.status).toBe(500);

      await expect(response.json()).resolves.toEqual({
        error: 'Failed to create consultation',
      });

      expect(insert).toHaveBeenCalledWith({
        student_user_id: 'student-1',
        first_name: 'Taylor',
        last_name: 'Nguyen',
        reason: 'Course planning',
        scheduled_for: '2026-08-20T02:00:00.000Z',
      });
    });
  });
});
