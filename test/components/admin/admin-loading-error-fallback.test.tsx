import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { AdminFallback } from '@/components/admin/admin-loading-error-fallback';

test('should show the administrator loading state', async () => {
  const screen = await render(<AdminFallback loading />);

  await expect
    .element(screen.getByText('Loading consultations...'))
    .toBeVisible();

  await expect.element(screen.getByRole('status')).toBeVisible();
});

test('should show the administrator empty state', async () => {
  const screen = await render(<AdminFallback loading={false} />);

  await expect
    .element(screen.getByText('No student consultations yet'))
    .toBeVisible();
});

test('should render administrator errors as an accessible plain-text message', async () => {
  const screen = await render(
    <AdminFallback
      loading={false}
      error="Failed to load administrator consultations"
    />,
  );

  await expect
    .element(screen.getByRole('alert'))
    .toHaveTextContent('Failed to load administrator consultations');

  await expect
    .element(
      screen.getByText('Failed to load administrator consultations', {
        exact: true,
      }),
    )
    .toBeVisible();
});
