import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { ConsultationSummaryCard } from '@/components/consultations/consultation-summary-card';
import { buildConsultation } from '@/test/fixtures/consultation';

test('should show the consultation summary and status', async () => {
  const screen = await render(
    <ConsultationSummaryCard consultation={buildConsultation()} />,
  );

  await expect.element(screen.getByText('Taylor Nguyen')).toBeVisible();
  await expect.element(screen.getByText('Course planning')).toBeVisible();

  await expect
    .element(screen.getByText('scheduled', { exact: true }))
    .toBeVisible();

  await expect
    .element(screen.getByText('Scheduled for', { exact: true }))
    .toBeVisible();
});

test('should label a consultation without actions as read-only', async () => {
  const screen = await render(
    <ConsultationSummaryCard consultation={buildConsultation()} />,
  );

  await expect.element(screen.getByText('Read-only')).toBeVisible();
});

test('should label a consultation with actions as owner scoped', async () => {
  const screen = await render(
    <ConsultationSummaryCard
      consultation={buildConsultation()}
      actions={<button type="button">Edit consultation</button>}
    />,
  );

  await expect.element(screen.getByText('Authenticated owner')).toBeVisible();

  await expect
    .element(screen.getByRole('button', { name: 'Edit consultation' }))
    .toBeVisible();
});

test('should show the student user id when requested', async () => {
  const screen = await render(
    <ConsultationSummaryCard
      consultation={buildConsultation({
        student_user_id: 'student-account-123',
      })}
      showStudentUserId
    />,
  );

  await expect.element(screen.getByText('Student user ID')).toBeVisible();
  await expect.element(screen.getByText('student-account-123')).toBeVisible();
});
