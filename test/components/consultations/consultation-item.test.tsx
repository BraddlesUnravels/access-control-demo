import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { buildConsultation } from '@/test/fixtures/consultation';
import { ConsultationItem } from '@/components/consultations/consultation-item';

test('should reschedule a scheduled consultation', async () => {
  const consultation = buildConsultation();
  const onReschedule = vi.fn().mockResolvedValue(undefined);

  const screen = await render(
    <ConsultationItem
      consultation={consultation}
      onCancel={vi.fn().mockResolvedValue(undefined)}
      onReschedule={onReschedule}
      onToggleCompleted={vi.fn().mockResolvedValue(undefined)}
    />,
  );

  const rescheduleInput = screen.getByLabelText('Reschedule', {
    exact: true,
  });

  await rescheduleInput.fill('2026-08-25T10:30');

  await screen
    .getByRole('button', {
      name: 'Reschedule',
    })
    .click();

  expect(onReschedule).toHaveBeenCalledOnce();

  expect(onReschedule).toHaveBeenCalledWith(
    consultation.id,
    '2026-08-25T10:30',
  );
});

test('should mark a scheduled consultation as complete', async () => {
  const consultation = buildConsultation();
  const onToggleCompleted = vi.fn().mockResolvedValue(undefined);

  const screen = await render(
    <ConsultationItem
      consultation={consultation}
      onCancel={vi.fn().mockResolvedValue(undefined)}
      onReschedule={vi.fn().mockResolvedValue(undefined)}
      onToggleCompleted={onToggleCompleted}
    />,
  );

  await screen
    .getByRole('button', {
      name: 'Mark complete',
    })
    .click();

  expect(onToggleCompleted).toHaveBeenCalledOnce();
  expect(onToggleCompleted).toHaveBeenCalledWith(consultation);
});

test('should cancel a scheduled consultation', async () => {
  const consultation = buildConsultation();
  const onCancel = vi.fn().mockResolvedValue(undefined);

  const screen = await render(
    <ConsultationItem
      consultation={consultation}
      onCancel={onCancel}
      onReschedule={vi.fn().mockResolvedValue(undefined)}
      onToggleCompleted={vi.fn().mockResolvedValue(undefined)}
    />,
  );

  await screen
    .getByRole('button', {
      name: 'Cancel',
    })
    .click();

  expect(onCancel).toHaveBeenCalledOnce();
  expect(onCancel).toHaveBeenCalledWith(consultation.id);
});

test('should disable all consultation actions when cancelled', async () => {
  const consultation = buildConsultation({
    status: 'cancelled',
  });

  const screen = await render(
    <ConsultationItem
      consultation={consultation}
      onCancel={vi.fn().mockResolvedValue(undefined)}
      onReschedule={vi.fn().mockResolvedValue(undefined)}
      onToggleCompleted={vi.fn().mockResolvedValue(undefined)}
    />,
  );

  await expect
    .element(
      screen.getByLabelText('Reschedule', {
        exact: true,
      }),
    )
    .toBeDisabled();

  await expect
    .element(
      screen.getByRole('button', {
        name: 'Reschedule',
      }),
    )
    .toBeDisabled();

  await expect
    .element(
      screen.getByRole('button', {
        name: 'Mark complete',
      }),
    )
    .toBeDisabled();

  await expect
    .element(
      screen.getByRole('button', {
        name: 'Cancel',
      }),
    )
    .toBeDisabled();
});

test('should allow a completed consultation to be marked incomplete and cancelled', async () => {
  const consultation = buildConsultation({
    status: 'completed',
  });
  const onCancel = vi.fn().mockResolvedValue(undefined);

  const screen = await render(
    <ConsultationItem
      consultation={consultation}
      onCancel={onCancel}
      onReschedule={vi.fn().mockResolvedValue(undefined)}
      onToggleCompleted={vi.fn().mockResolvedValue(undefined)}
    />,
  );

  const markIncompleteButton = screen.getByRole('button', {
    name: 'Mark incomplete',
  });

  await expect.element(markIncompleteButton).toBeEnabled();

  await expect
    .element(
      screen.getByRole('button', {
        name: 'Reschedule',
      }),
    )
    .toBeDisabled();

  const cancelButton = screen.getByRole('button', {
    name: 'Cancel',
  });

  await expect.element(cancelButton).toBeEnabled();

  await cancelButton.click();

  expect(onCancel).toHaveBeenCalledOnce();
  expect(onCancel).toHaveBeenCalledWith(consultation.id);
});
