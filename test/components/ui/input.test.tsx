import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { PasswordInput } from '@/components/ui/input';

test('should toggle password visibility', async () => {
  const screen = await render(<PasswordInput id="password" />);

  const passwordInput = screen.getByLabelText('Password input field', {
    exact: true,
  });

  const showPasswordButton = screen.getByRole('button', {
    name: 'Show password',
    exact: true,
  });

  await expect.element(passwordInput).toHaveAttribute('type', 'password');
  await expect.element(showPasswordButton).toBeInTheDocument();

  await showPasswordButton.click();

  await expect.element(passwordInput).toHaveAttribute('type', 'text');

  const hidePasswordButton = screen.getByRole('button', {
    name: 'Hide password',
    exact: true,
  });

  await expect.element(hidePasswordButton).toBeInTheDocument();

  await hidePasswordButton.click();

  await expect.element(passwordInput).toHaveAttribute('type', 'password');
});
