import { beforeEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import type { ConsultationRecord } from '@/lib/validation/types';
import { buildConsultation } from '@/test/fixtures/consultation';
import { ConsultationListAdmin } from '@/components/admin/admin-consultation-list';

const swrMock = vi.hoisted(() => ({
  state: {
    data: [] as ConsultationRecord[],
    error: undefined as Error | undefined,
    isLoading: false,
  },
}));

vi.mock('swr', () => ({
  default: () => swrMock.state,
}));

beforeEach(() => {
  swrMock.state.data = [];
  swrMock.state.error = undefined;
  swrMock.state.isLoading = false;
});

test('should show the admin loading state', async () => {
  swrMock.state.isLoading = true;

  const screen = await render(<ConsultationListAdmin />);

  await expect
    .element(screen.getByText('Loading consultations...'))
    .toBeVisible();
});

test('should show the admin empty state', async () => {
  const screen = await render(<ConsultationListAdmin />);

  await expect
    .element(screen.getByText('No student consultations yet'))
    .toBeVisible();
});

test('should render consultations returned by the administrator query', async () => {
  swrMock.state.data = [buildConsultation()];

  const screen = await render(<ConsultationListAdmin />);

  await expect.element(screen.getByText('Taylor Nguyen')).toBeVisible();
  await expect.element(screen.getByText('student-1')).toBeVisible();
});

test('should show the admin error fallback when the query fails', async () => {
  swrMock.state.error = new Error('Failed to load administrator consultations');

  const screen = await render(<ConsultationListAdmin />);

  await expect
    .element(screen.getByText(/Error .* fetching consultations/))
    .toBeVisible();

  await expect
    .element(screen.getByText('Failed to load administrator consultations'))
    .toBeVisible();
});

test('should show the owning student id on administrator records', async () => {
  swrMock.state.data = [
    buildConsultation({ student_user_id: 'student-account-123' }),
  ];

  const screen = await render(<ConsultationListAdmin />);

  await expect.element(screen.getByText('student-account-123')).toBeVisible();
});
