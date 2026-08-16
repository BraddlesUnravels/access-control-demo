import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

import { PasswordInput } from '@/components/ui/input';

test('should toggle password visibility', async () => {
  const screen = await render(
    <>
      <label htmlFor="password">Password</label>
      <PasswordInput id="password" />
    </>,
  );

  const password = screen.getByLabelText('Password', {
    exact: true,
  });

  const showPasswordButton = screen.getByRole('button', {
    name: 'Show password',
  });

  await expect.element(password).toHaveAttribute('type', 'password');
  await expect.element(showPasswordButton).toBeInTheDocument();

  await showPasswordButton.click();

  await expect.element(password).toHaveAttribute('type', 'text');

  const hidePasswordButton = screen.getByRole('button', {
    name: 'Hide password',
  });

  await expect.element(hidePasswordButton).toBeInTheDocument();

  await hidePasswordButton.click();

  await expect.element(password).toHaveAttribute('type', 'password');
});
