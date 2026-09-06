import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

const { updatePasswordAction } = vi.hoisted(() => ({
  updatePasswordAction: vi.fn(async (...args: [unknown, FormData]) => {
    void args;
    return {};
  }),
}));

vi.mock('@/app/auth/actions', () => ({
  updatePasswordAction,
}));

test('submits a replacement password from the recovery form', async () => {
  const { UpdatePasswordForm } =
    await import('@/components/ui/forms/update-password-form');

  const screen = await render(<UpdatePasswordForm />);

  const passwordInputs = screen.getByLabelText('Password input field', {
    exact: true,
  });
  const newPasswordInput = passwordInputs.nth(0);
  const confirmPasswordInput = passwordInputs.nth(1);
  const submitButton = screen.getByRole('button', {
    name: 'Update password',
    exact: true,
  });

  await newPasswordInput.fill('valid-new-password');
  await confirmPasswordInput.fill('valid-new-password');
  await submitButton.click();

  await expect.poll(() => updatePasswordAction.mock.calls.length).toBe(1);

  const formData = updatePasswordAction.mock.calls[0]?.[1];

  expect(formData).toBeInstanceOf(FormData);
  expect(formData?.get('new-password')).toBe('valid-new-password');
  expect(formData?.get('confirm-password')).toBe('valid-new-password');
});
