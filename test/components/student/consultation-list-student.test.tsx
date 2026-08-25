import { beforeEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import type { ConsultationRecord } from '@/lib/validation/types';
import { buildConsultation } from '@/test/fixtures/consultation';
import { ConsultationListStudent } from '@/components/student/consultation-list-student';

const studentMocks = vi.hoisted(() => ({
  query: {
    consultations: [] as ConsultationRecord[],
    loading: false,
    error: undefined as string | undefined,
  },
  actions: {
    error: undefined as string | undefined,
    cancelConsultation: vi.fn(),
    reschedule: vi.fn(),
    toggleCompleted: vi.fn(),
  },
}));

vi.mock('@/components/student/student-consultation-hook', () => ({
  useStudentConsultations: () => studentMocks.query,
}));

vi.mock('@/components/student/student-consultation-action-hook', () => ({
  useStudentConsultationActions: () => studentMocks.actions,
}));

beforeEach(() => {
  vi.clearAllMocks();

  studentMocks.query.consultations = [];
  studentMocks.query.loading = false;
  studentMocks.query.error = undefined;

  studentMocks.actions.error = undefined;
  studentMocks.actions.cancelConsultation.mockResolvedValue(undefined);
  studentMocks.actions.reschedule.mockResolvedValue(undefined);
  studentMocks.actions.toggleCompleted.mockResolvedValue(undefined);
});

test('should show the empty state when the student has no consultations', async () => {
  const screen = await render(<ConsultationListStudent />);

  await expect
    .element(screen.getByText('You have no consultations yet'))
    .toBeVisible();

  await expect
    .element(
      screen.getByText('Consultations will appear here once you create them'),
    )
    .toBeVisible();
});

test('shows the loading state while consultations are being fetched', async () => {
  studentMocks.query.loading = true;

  const screen = await render(<ConsultationListStudent />);

  await expect
    .element(screen.getByText('Loading consultations...'))
    .toBeVisible();
});

test('should show a load error returned by the consultation query', async () => {
  studentMocks.query.error = 'Failed to load consultations';

  const screen = await render(<ConsultationListStudent />);

  await expect
    .element(screen.getByText(/Error .* fetching consultations/))
    .toBeVisible();

  await expect
    .element(screen.getByText('Failed to load consultations'))
    .toBeVisible();
});

test('should render consultations and connects their student actions', async () => {
  const consultation = buildConsultation();
  studentMocks.query.consultations = [consultation];

  const screen = await render(<ConsultationListStudent />);

  await expect.element(screen.getByText('Taylor Nguyen')).toBeVisible();

  await screen.getByRole('button', { name: 'Mark complete' }).click();

  expect(studentMocks.actions.toggleCompleted).toHaveBeenCalledOnce();
  expect(studentMocks.actions.toggleCompleted).toHaveBeenCalledWith(
    consultation,
  );
});

test('should show mutation errors returned by the student action hook', async () => {
  studentMocks.query.consultations = [buildConsultation()];
  studentMocks.actions.error = 'Failed to update consultation status';

  const screen = await render(<ConsultationListStudent />);

  await expect
    .element(screen.getByRole('alert'))
    .toHaveTextContent('Failed to update consultation status');
});
