import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { DateTimeInput, Input, PasswordInput } from '@/components/ui/input';

test('Input forwards native attributes and accepts user input', async () => {
  const screen = await render(
    <Input
      id="email-address"
      aria-label="Email address"
      type="email"
      name="email"
      required
      maxLength={120}
    />,
  );

  const input = screen.getByLabelText('Email address', {
    exact: true,
  });

  await expect.element(input).toHaveAttribute('type', 'email');
  await expect.element(input).toHaveAttribute('name', 'email');
  await expect.element(input).toHaveAttribute('maxlength', '120');
  await expect.element(input).toBeRequired();
  await expect.element(input).toBeEnabled();

  await input.fill('student@example.com');

  await expect.element(input).toHaveValue('student@example.com');
});

test('Input should respect its disabled state', async () => {
  const screen = await render(<Input aria-label="Disabled input" disabled />);

  const input = screen.getByLabelText('Disabled input', {
    exact: true,
  });

  await expect.element(input).toBeDisabled();
});

test('PasswordInput should toggle visibility without clearing its value', async () => {
  const screen = await render(<PasswordInput id="password" />);

  const passwordInput = screen.getByLabelText('Password input field', {
    exact: true,
  });

  const showPasswordButton = screen.getByRole('button', {
    name: 'Show password',
    exact: true,
  });

  await passwordInput.fill('correct-horse-battery-staple');

  await expect.element(passwordInput).toHaveAttribute('type', 'password');
  await expect
    .element(passwordInput)
    .toHaveValue('correct-horse-battery-staple');

  await showPasswordButton.click();

  await expect.element(passwordInput).toHaveAttribute('type', 'text');
  await expect
    .element(passwordInput)
    .toHaveValue('correct-horse-battery-staple');

  const hidePasswordButton = screen.getByRole('button', {
    name: 'Hide password',
    exact: true,
  });

  await hidePasswordButton.click();

  await expect.element(passwordInput).toHaveAttribute('type', 'password');
  await expect
    .element(passwordInput)
    .toHaveValue('correct-horse-battery-staple');
});

test('DateTimeInput should render an accessible picker control', async () => {
  const screen = await render(
    <DateTimeInput id="scheduled-for" aria-label="Date and time" />,
  );

  const dateTimeInput = screen.getByLabelText('Date and time', {
    exact: true,
  });

  const pickerButton = screen.getByRole('button', {
    name: 'Show date and time picker',
    exact: true,
  });

  await expect.element(dateTimeInput).toHaveAttribute('type', 'datetime-local');

  await expect.element(dateTimeInput).toBeEnabled();
  await expect.element(pickerButton).toBeEnabled();
  await expect
    .element(pickerButton)
    .toHaveAttribute('aria-controls', 'scheduled-for');
});

test('DateTimeInput picker button should open its associated input', async () => {
  const screen = await render(
    <DateTimeInput id="scheduled-for" aria-label="Date and time" />,
  );

  const dateTimeInput = screen.getByLabelText('Date and time', {
    exact: true,
  });

  const pickerButton = screen.getByRole('button', {
    name: 'Show date and time picker',
    exact: true,
  });

  const showPicker = vi
    .spyOn(dateTimeInput.element() as HTMLInputElement, 'showPicker')
    .mockImplementation(() => undefined);

  await pickerButton.click();

  expect(showPicker).toHaveBeenCalledOnce();
});

test('DateTimeInput should disable both the input and picker button', async () => {
  const screen = await render(
    <DateTimeInput id="scheduled-for" aria-label="Date and time" disabled />,
  );

  const dateTimeInput = screen.getByLabelText('Date and time', {
    exact: true,
  });

  const pickerButton = screen.getByRole('button', {
    name: 'Show date and time picker',
    exact: true,
  });

  await expect.element(dateTimeInput).toBeDisabled();
  await expect.element(pickerButton).toBeDisabled();
});

test('DateTimeInput should associate each picker button with its own input', async () => {
  const screen = await render(
    <>
      <DateTimeInput id="first-date" aria-label="First date" />

      <DateTimeInput id="second-date" aria-label="Second date" />
    </>,
  );

  const pickerButtons = screen.getByRole('button', {
    name: 'Show date and time picker',
    exact: true,
  });

  await expect
    .element(pickerButtons.nth(0))
    .toHaveAttribute('aria-controls', 'first-date');

  await expect
    .element(pickerButtons.nth(1))
    .toHaveAttribute('aria-controls', 'second-date');
});
