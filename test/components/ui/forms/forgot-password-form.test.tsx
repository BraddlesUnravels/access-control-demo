import type { ComponentProps } from 'react';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: ComponentProps<'a'>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const { requestPasswordResetAction } = vi.hoisted(() => ({
  requestPasswordResetAction: vi.fn(async (...args: [unknown, FormData]) => {
    void args;
    return { success: true };
  }),
}));

vi.mock('@/app/auth/actions', () => ({
  requestPasswordResetAction,
}));

test('should submit an email from the password reset request form', async () => {
  const { ForgotPasswordForm } =
    await import('@/components/ui/forms/forgot-password-form');

  const screen = await render(<ForgotPasswordForm />);

  const emailInput = screen.getByLabelText('Email', {
    exact: true,
  });
  const submitButton = screen.getByRole('button', {
    name: 'Send reset email',
    exact: true,
  });

  await emailInput.fill('student@example.com');
  await submitButton.click();

  await expect.poll(() => requestPasswordResetAction.mock.calls.length).toBe(1);

  const formData = requestPasswordResetAction.mock.calls[0]?.[1];

  expect(formData).toBeInstanceOf(FormData);
  expect(formData?.get('email')).toBe('student@example.com');
});

test('should display success message after password reset request submission', async () => {
  const { ForgotPasswordForm } =
    await import('@/components/ui/forms/forgot-password-form');

  const screen = await render(<ForgotPasswordForm />);

  const emailInput = screen.getByLabelText('Email', {
    exact: true,
  });
  const submitButton = screen.getByRole('button', {
    name: 'Send reset email',
    exact: true,
  });

  await emailInput.fill('student@example.com');
  await submitButton.click();

  await expect.element(screen.getByText('Check Your Email')).toBeVisible();
  await expect
    .element(screen.getByText('Password reset instructions sent'))
    .toBeVisible();
});
