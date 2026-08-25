import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { StudentConsultHeader } from '@/components/student/consultation-header';

test('should identify the student workspace and its ownership scope', async () => {
  const screen = await render(<StudentConsultHeader />);

  await expect
    .element(
      screen.getByRole('heading', {
        level: 1,
        name: 'Consultation dashboard',
      }),
    )
    .toBeVisible();

  await expect.element(screen.getByText('Student workspace')).toBeVisible();
  await expect.element(screen.getByText('Ownership scoped')).toBeVisible();
});
