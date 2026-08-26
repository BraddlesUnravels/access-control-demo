import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { AdminHeader } from '@/components/admin/admin-header';

test('should identify the administrator workspace as read-only', async () => {
  const screen = await render(<AdminHeader />);

  await expect.element(screen.getByRole('banner')).toBeVisible();

  await expect
    .element(screen.getByText('Administrator workspace'))
    .toBeVisible();

  await expect.element(screen.getByText('Read only')).toBeVisible();
});

test('should describe the administrator read-only access path', async () => {
  const screen = await render(<AdminHeader />);

  await expect
    .element(
      screen.getByText(
        /Review consultation records across the LMS through the administrator's read-only access path\./,
      ),
    )
    .toBeInTheDocument();
});
