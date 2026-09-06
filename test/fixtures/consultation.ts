import type { ConsultationRecord } from '@/lib/validation/types';

const BASE_CONSULTATION: ConsultationRecord = {
  id: '0197d2ee-6242-7616-8ef5-474ad0ecff0f',
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
};

export const buildConsultation = (
  overrides: Partial<ConsultationRecord> = {},
): ConsultationRecord => ({
  ...BASE_CONSULTATION,
  ...overrides,
});
