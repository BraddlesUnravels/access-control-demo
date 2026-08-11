import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  cancelStudentConsultation,
  createStudentConsultation,
  getAdminConsultations,
  getStudentConsultations,
  updateStudentConsultation,
} from '@/lib/consultations/api';

const CONSULTATION = {
  id: 'consultation-1',
  student_user_id: 'student-1',
  first_name: 'Taylor',
  last_name: 'Nguyen',
  reason: 'Course planning',
  scheduled_for: '2026-08-20T02:00:00.000Z',
  status: 'scheduled',
  created_at: '2026-08-11T01:00:00.000Z',
  updated_at: '2026-08-11T01:00:00.000Z',
  completed_at: null,
  cancelled_at: null,
} as const;

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });

describe('lib/consultations/api', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should load student consultations from the student endpoint', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ data: [CONSULTATION] }));

    vi.stubGlobal('fetch', fetchMock);

    await expect(getStudentConsultations()).resolves.toEqual([CONSULTATION]);

    expect(fetchMock).toHaveBeenCalledWith('/api/consultations', {
      method: 'GET',
    });
  });

  it('should load administrator consultations from the admin endpoint', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ data: [CONSULTATION] }));

    vi.stubGlobal('fetch', fetchMock);

    await expect(getAdminConsultations()).resolves.toEqual([CONSULTATION]);

    expect(fetchMock).toHaveBeenCalledWith('/api/admin/consultations', {
      method: 'GET',
    });
  });

  it('should reject a successful response that does not match the consultation contract', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        data: [
          {
            id: 'consultation-1',
            status: 'scheduled',
          },
        ],
      }),
    );

    vi.stubGlobal('fetch', fetchMock);

    await expect(getStudentConsultations()).rejects.toThrow(
      'Failed to load consultations',
    );
  });

  it('should use the API error message when a request fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          error: 'Forbidden',
        },
        403,
      ),
    );

    vi.stubGlobal('fetch', fetchMock);

    await expect(getStudentConsultations()).rejects.toThrow('Forbidden');
  });

  it('should create a consultation with the expected request body', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ data: CONSULTATION }, 201));

    vi.stubGlobal('fetch', fetchMock);

    const input = {
      firstName: 'Taylor',
      lastName: 'Nguyen',
      reason: 'Course planning',
      scheduledFor: '2026-08-20T02:00:00.000Z',
    };

    await expect(createStudentConsultation(input)).resolves.toEqual(
      CONSULTATION,
    );

    expect(fetchMock).toHaveBeenCalledWith('/api/consultations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });
  });

  it('should update a consultation with the expected request body', async () => {
    const updatedConsultation = {
      ...CONSULTATION,
      status: 'completed',
      completed_at: '2026-08-20T03:00:00.000Z',
    } as const;

    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ data: updatedConsultation }));

    vi.stubGlobal('fetch', fetchMock);

    await expect(
      updateStudentConsultation('consultation-1', {
        status: 'completed',
      }),
    ).resolves.toEqual(updatedConsultation);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/consultations/consultation-1',
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'completed',
        }),
      },
    );
  });

  it('should cancel a consultation with DELETE', async () => {
    const cancelledConsultation = {
      ...CONSULTATION,
      status: 'cancelled',
      cancelled_at: '2026-08-20T03:00:00.000Z',
    } as const;

    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ data: cancelledConsultation }));

    vi.stubGlobal('fetch', fetchMock);

    await expect(cancelStudentConsultation('consultation-1')).resolves.toEqual(
      cancelledConsultation,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/consultations/consultation-1',
      {
        method: 'DELETE',
      },
    );
  });
});
