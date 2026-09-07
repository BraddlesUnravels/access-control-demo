import type { ComponentProps } from 'react';
import { expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: ComponentProps<'a'>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const authMocks = vi.hoisted(() => ({
  signInAction: vi.fn(async () => ({})),
}));

vi.mock('@/app/auth/actions', () => authMocks);

test('should follow the intended login keyboard focus order', async () => {
  const { LoginForm } = await import('@/components/ui/forms/login-form');

  const screen = await render(<LoginForm />);

  const emailInput = screen.getByLabelText('Email', {
    exact: true,
  });

  const passwordInput = screen.getByLabelText('Password', {
    exact: true,
  });

  const showPasswordButton = screen.getByRole('button', {
    name: 'Show password',
    exact: true,
  });

  const signInButton = screen.getByRole('button', {
    name: 'Sign in',
    exact: true,
  });

  const forgotPasswordLink = screen.getByRole('link', {
    name: 'Forgot password?',
    exact: true,
  });

  const signUpLink = screen.getByRole('link', {
    name: 'Sign up',
    exact: true,
  });

  await expect
    .element(forgotPasswordLink)
    .toHaveAttribute('href', '/auth/forgot-password');

  await expect.element(signUpLink).toHaveAttribute('href', '/auth/sign-up');

  await emailInput.click();

  await expect.element(emailInput).toHaveFocus();

  await userEvent.tab();

  await expect.element(passwordInput).toHaveFocus();

  await userEvent.tab();

  await expect.element(showPasswordButton).toHaveFocus();

  await userEvent.tab();

  await expect.element(signInButton).toHaveFocus();

  await userEvent.tab();

  await expect.element(forgotPasswordLink).toHaveFocus();

  await userEvent.tab();

  await expect.element(signUpLink).toHaveFocus();
});

test('should show a safe login failure message returned by the server action', async () => {
  authMocks.signInAction.mockResolvedValueOnce({
    error: 'Invalid email or password',
  });

  const { LoginForm } = await import('@/components/ui/forms/login-form');
  const screen = await render(<LoginForm />);

  await screen
    .getByLabelText('Email', { exact: true })
    .fill('student@example.com');
  await screen
    .getByLabelText('Password', { exact: true })
    .fill('wrong-password');
  await screen.getByRole('button', { name: 'Sign in', exact: true }).click();

  await expect
    .element(screen.getByRole('alert'))
    .toHaveTextContent('Invalid email or password');
});
