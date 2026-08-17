import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
// Test the ConsultationList component
import { ConsultationList } from '@/components/student/consultation-list';

test('should show an empty state when there are no consulations', async () => {
  const screen = await render(
    <ConsultationList
      consultations={[]}
      onCancel={vi.fn()}
      onReschedule={vi.fn()}
      onToggleCompleted={vi.fn()}
    />,
  );

  await expect.element(screen.getByText('No consultations yet')).toBeVisible();

  await expect
    .element(
      screen.getByText('Create your first consultation using the form above'),
    )
    .toBeVisible();
});
