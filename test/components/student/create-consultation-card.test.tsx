import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import {
  CONSULTATION_NAME_MAX_LENGTH,
  CONSULTATION_REASON_MAX_LENGTH,
} from '@/lib/validation/limits';
// Component to test
import { CreateConsultationCard } from '@/components/student/create-consultation-card';

test('should submit the consultation form and clear after success', async () => {
  const onCreateConsultation = vi.fn().mockResolvedValueOnce(undefined);

  const screen = await render(
    <CreateConsultationCard onCreateConsultation={onCreateConsultation} />,
  );

  const firstName = screen.getByLabelText('First name');
  const lastName = screen.getByLabelText('Last name');
  const reason = screen.getByLabelText('Reason');
  const scheduledFor = screen.getByLabelText('Date and Time');

  await firstName.fill('Pickle');
  await lastName.fill('Rick');
  await reason.fill('I have a question about the multiverse');
  await scheduledFor.fill('2024-06-01T10:30');

  await screen.getByRole('button', { name: 'Create Consultation' }).click();

  expect(onCreateConsultation).toHaveBeenCalledOnce();
  expect(onCreateConsultation).toHaveBeenCalledWith({
    firstName: 'Pickle',
    lastName: 'Rick',
    reason: 'I have a question about the multiverse',
    scheduledFor: '2024-06-01T10:30',
  });

  await expect.element(firstName).toHaveValue('');
  await expect.element(lastName).toHaveValue('');
  await expect.element(reason).toHaveValue('');
  await expect.element(scheduledFor).toHaveValue('');
});

test('preserves the form when consultation creation fails', async () => {
  const onCreateConsultation = vi
    .fn()
    .mockRejectedValue(new Error('Unable to create consultation'));

  const screen = await render(
    <CreateConsultationCard onCreateConsultation={onCreateConsultation} />,
  );

  const firstName = screen.getByLabelText('First name');
  const lastName = screen.getByLabelText('Last name');
  const reason = screen.getByLabelText('Reason');
  const scheduledFor = screen.getByLabelText('Date and time');

  await firstName.fill('Taylor');
  await lastName.fill('Nguyen');
  await reason.fill('Course planning');
  await scheduledFor.fill('2026-08-20T14:30');

  await screen
    .getByRole('button', {
      name: 'Create consultation',
    })
    .click();

  await expect
    .element(
      screen.getByRole('button', {
        name: 'Create consultation',
      }),
    )
    .toBeEnabled();

  await expect.element(firstName).toHaveValue('Taylor');
  await expect.element(lastName).toHaveValue('Nguyen');
  await expect.element(reason).toHaveValue('Course planning');
  await expect.element(scheduledFor).toHaveValue('2026-08-20T14:30');
});

test('disables the submit button while creation is in progress', async () => {
  let resolveCreate!: () => void;

  const onCreateConsultation = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        resolveCreate = resolve;
      }),
  );

  const screen = await render(
    <CreateConsultationCard onCreateConsultation={onCreateConsultation} />,
  );

  await screen.getByLabelText('First name').fill('Taylor');
  await screen.getByLabelText('Last name').fill('Nguyen');
  await screen.getByLabelText('Reason').fill('Course planning');
  await screen.getByLabelText('Date and time').fill('2026-08-20T14:30');

  await screen
    .getByRole('button', {
      name: 'Create consultation',
    })
    .click();

  const loadingButton = screen.getByRole('button', {
    name: 'Creating...',
  });

  await expect.element(loadingButton).toBeDisabled();

  resolveCreate();

  await expect
    .element(
      screen.getByRole('button', {
        name: 'Create consultation',
      }),
    )
    .toBeEnabled();
});

test('exposes consultation text limits to browser inputs', async () => {
  const screen = await render(
    <CreateConsultationCard onCreateConsultation={vi.fn()} />,
  );

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
