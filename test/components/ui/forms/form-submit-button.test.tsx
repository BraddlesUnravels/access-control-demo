import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
// Test for the FormSubmitButton component
import { FormSubmitButton } from '@/components/ui/form-submit-button';

test('should reneder the normal label when not loading', async () => {
  const screen = await render(
    <FormSubmitButton loadingLabel="Saving..." isLoading={false}>
      Save
    </FormSubmitButton>,
  );

  const button = screen.getByRole('button', {
    name: 'Save',
  });

  await expect.element(button).toBeEnabled();
  await expect.element(button).not.toHaveAttribute('aria-busy', 'true');
});

test('should reneder the loading label when loading', async () => {
  const screen = await render(
    <FormSubmitButton loadingLabel="Saving..." isLoading={true}>
      Save
    </FormSubmitButton>,
  );

  const button = screen.getByRole('button', {
    name: 'Saving...',
  });

  await expect.element(button).toBeDisabled();
  await expect.element(button).toHaveAttribute('aria-busy', 'true');
});

test('should respect and expicitly set disabled state', async () => {
  const screen = await render(
    <FormSubmitButton loadingLabel="Saving..." isLoading={false} disabled>
      Save
    </FormSubmitButton>,
  );

  const button = screen.getByRole('button', {
    name: 'Save',
  });

  await expect.element(button).toBeDisabled();
  await expect.element(button).not.toHaveAttribute('aria-busy', 'true');
});
