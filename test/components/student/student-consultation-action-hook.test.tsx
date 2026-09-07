import { beforeEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { useStudentConsultationActions } from '@/components/student/student-consultation-action-hook';
import { buildConsultation } from '@/test/fixtures/consultation';

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  updateStudentConsultation: vi.fn(),
}));

vi.mock('swr', () => ({
  useSWRConfig: () => ({ mutate: mocks.mutate }),
}));

vi.mock('@/lib/consultations/api', () => ({
  STUDENT_CONSULTATIONS_API_PATH: '/api/consultations',
  cancelStudentConsultation: vi.fn(),
  createStudentConsultation: vi.fn(),
  updateStudentConsultation: mocks.updateStudentConsultation,
}));

const consultation = buildConsultation();

const ActionHarness = () => {
  const { error, toggleCompleted } = useStudentConsultationActions();

  return (
    <>
      <button type="button" onClick={() => void toggleCompleted(consultation)}>
        Complete consultation
      </button>
      {error && <div role="alert">{error}</div>}
    </>
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.updateStudentConsultation.mockResolvedValue(consultation);
  mocks.mutate.mockResolvedValue(undefined);
});

test('should surface a failed revalidation after a successful mutation', async () => {
  mocks.mutate.mockRejectedValueOnce(new Error('Consultation refresh failed'));

  const screen = await render(<ActionHarness />);

  await screen.getByRole('button', { name: 'Complete consultation' }).click();

  expect(mocks.updateStudentConsultation).toHaveBeenCalledWith(
    consultation.id,
    { status: 'completed' },
    'Failed to update consultation status',
  );
  expect(mocks.mutate).toHaveBeenCalledWith('/api/consultations');
  await expect
    .element(screen.getByRole('alert'))
    .toHaveTextContent('Consultation refresh failed');
});
