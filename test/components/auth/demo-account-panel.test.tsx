import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { DEMO_ACCOUNTS } from '@/lib/demo-accounts';
// Test for the DemoAccountPanel component
import { DemoAccountsPanel } from '@/components/auth/demo-account-panel';

test('should call onAccountSelect with the select account', async () => {
  const account = DEMO_ACCOUNTS[0];
  const onAccountSelect = vi.fn();

  const screen = await render(
    <DemoAccountsPanel
      accounts={[account]}
      onAccountSelect={onAccountSelect}
    />,
  );

  await screen
    .getByRole('button', {
      name: 'Use this account',
    })
    .click();

  expect(onAccountSelect).toHaveBeenCalledOnce();
  expect(onAccountSelect).toHaveBeenCalledWith(account);
});

test('should mark the selected account as pressed', async () => {
  const account = DEMO_ACCOUNTS[0];

  const screen = await render(
    <DemoAccountsPanel
      accounts={[account]}
      selectedAccountId={account.id}
      onAccountSelect={vi.fn()}
    />,
  );

  const selectedButton = screen.getByRole('button', {
    name: 'Selected',
  });

  await expect.element(selectedButton).toHaveAttribute('aria-pressed', 'true');
});
