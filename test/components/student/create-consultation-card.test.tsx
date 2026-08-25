import { beforeEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import {
  CONSULTATION_NAME_MAX_LENGTH,
  CONSULTATION_REASON_MAX_LENGTH,
} from '@/lib/validation/limits';
import { CreateConsultationCard } from '@/components/student/create-consultation-card';

const actionMocks = vi.hoisted(() => ({
  error: undefined as string | undefined,
  createConsultation: vi.fn(),
  toggleCompleted: vi.fn(),
  reschedule: vi.fn(),
  cancelConsultation: vi.fn(),
}));

vi.mock('@/components/student/student-consultation-action-hook', () => ({
  useStudentConsultationActions: () => actionMocks,
}));

beforeEach(() => {
  vi.resetAllMocks();
  actionMocks.error = undefined;
  actionMocks.createConsultation.mockResolvedValue(undefined);
});

const FUTURE_SCHEDULED_FOR = '2099-06-01T10:30';
const CREATE_BUTTON_TEST_ID = 'create-consultation-button';
const SCHEDULED_FOR_TEST_ID = 'scheduled-for-input';

const createDeferred = () => {
  let resolve!: () => void;

  const promise = new Promise<void>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
};

test('should submit the consultation form and clear after success', async () => {
  const screen = await render(<CreateConsultationCard />);

  const firstName = screen.getByLabelText('First name');
  const lastName = screen.getByLabelText('Last name');
  const reason = screen.getByLabelText('Reason');
  const scheduledFor = screen.getByTestId(SCHEDULED_FOR_TEST_ID);
  const submitButton = screen.getByTestId(CREATE_BUTTON_TEST_ID);

  await firstName.fill('Pickle');
  await lastName.fill('Rick');
  await reason.fill('I have a question about the multiverse');
  await scheduledFor.fill(FUTURE_SCHEDULED_FOR);
  await submitButton.click();

  expect(actionMocks.createConsultation).toHaveBeenCalledOnce();
  expect(actionMocks.createConsultation).toHaveBeenCalledWith({
    firstName: 'Pickle',
    lastName: 'Rick',
    reason: 'I have a question about the multiverse',
    scheduledFor: FUTURE_SCHEDULED_FOR,
  });

  await expect.element(submitButton).toBeEnabled();
  await expect.element(firstName).toHaveValue('');
  await expect.element(lastName).toHaveValue('');
  await expect.element(reason).toHaveValue('');
  await expect.element(scheduledFor).toHaveValue('');
});

test('should preserve the form when consultation creation fails', async () => {
  actionMocks.createConsultation.mockRejectedValueOnce(
    new Error('Unable to create consultation'),
  );

  const screen = await render(<CreateConsultationCard />);

  const firstName = screen.getByLabelText('First name');
  const lastName = screen.getByLabelText('Last name');
  const reason = screen.getByLabelText('Reason');
  const scheduledFor = screen.getByTestId(SCHEDULED_FOR_TEST_ID);
  const submitButton = screen.getByTestId(CREATE_BUTTON_TEST_ID);

  await firstName.fill('Paul');
  await lastName.fill('Hogan');
  await reason.fill('Acting classes for Crocodile Dundee or Hogan the Bogan');
  await scheduledFor.fill(FUTURE_SCHEDULED_FOR);
  await submitButton.click();

  await expect.element(submitButton).toBeEnabled();
  await expect
    .element(screen.getByRole('alert'))
    .toHaveTextContent('Unable to create consultation');
  await expect.element(firstName).toHaveValue('Paul');
  await expect.element(lastName).toHaveValue('Hogan');
  await expect
    .element(reason)
    .toHaveValue('Acting classes for Crocodile Dundee or Hogan the Bogan');
  await expect.element(scheduledFor).toHaveValue(FUTURE_SCHEDULED_FOR);
});

test('should disable the submit button while creation is in progress', async () => {
  const deferredCreate = createDeferred();

  actionMocks.createConsultation.mockReturnValueOnce(deferredCreate.promise);

  const screen = await render(<CreateConsultationCard />);

  const submitButton = screen.getByTestId(CREATE_BUTTON_TEST_ID);

  await screen.getByLabelText('First name').fill('Bart');
  await screen.getByLabelText('Last name').fill('Simpson');
  await screen.getByLabelText('Reason').fill('I want to be a prankster');
  await screen.getByTestId(SCHEDULED_FOR_TEST_ID).fill(FUTURE_SCHEDULED_FOR);
  await submitButton.click();

  expect(actionMocks.createConsultation).toHaveBeenCalledOnce();

  await expect.element(submitButton).toBeDisabled();
  await expect.element(submitButton).toHaveAttribute('aria-busy', 'true');

  deferredCreate.resolve();

  await expect.element(submitButton).toBeEnabled();
  await expect.element(submitButton).toHaveAttribute('aria-busy', 'false');
});

test('should expose consultation text limits to browser inputs', async () => {
  const screen = await render(<CreateConsultationCard />);

  await expect
    .element(screen.getByLabelText('First name'))
    .toHaveAttribute('maxlength', String(CONSULTATION_NAME_MAX_LENGTH));

  await expect
    .element(screen.getByLabelText('Last name'))
    .toHaveAttribute('maxlength', String(CONSULTATION_NAME_MAX_LENGTH));

  await expect
    .element(screen.getByLabelText('Reason'))
    .toHaveAttribute('maxlength', String(CONSULTATION_REASON_MAX_LENGTH));
});

test('should show a create error returned by the student action hook', async () => {
  actionMocks.error = 'Unable to create consultation';

  const screen = await render(<CreateConsultationCard />);

  await expect
    .element(screen.getByRole('alert'))
    .toHaveTextContent('Unable to create consultation');
});
