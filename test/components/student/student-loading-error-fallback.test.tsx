import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { StudentFallback } from '@/components/student/student-loading-error-fallback';

test('should show the student loading state', async () => {
  const screen = await render(<StudentFallback loading />);

  await expect
    .element(screen.getByText('Loading consultations...'))
    .toBeVisible();

  await expect.element(screen.getByRole('status')).toBeVisible();
});

test('should show the student empty state', async () => {
  const screen = await render(<StudentFallback loading={false} />);

  await expect
    .element(screen.getByText('You have no consultations yet'))
    .toBeVisible();
});

test('should announce student load errors accessibly', async () => {
  const screen = await render(
    <StudentFallback loading={false} error="Failed to load consultations" />,
  );

  await expect
    .element(screen.getByRole('alert'))
    .toHaveTextContent('Failed to load consultations');
});
