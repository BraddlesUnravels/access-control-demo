import { beforeEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { AccessGateForm } from '@/components/ui/forms/access-gate-form';

const routerMocks = vi.hoisted(() => ({
  replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => routerMocks,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test('should show the safe access-gate failure message returned by the API', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'This invite code has expired.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  );

  const screen = await render(<AccessGateForm />);

  await screen
    .getByLabelText('Invite code', { exact: true })
    .fill('ACD-TEST-CODE');
  await screen
    .getByRole('button', { name: 'Unlock demo', exact: true })
    .click();

  await expect
    .element(screen.getByRole('alert'))
    .toHaveTextContent('This invite code has expired.');
  expect(routerMocks.replace).not.toHaveBeenCalled();
});
