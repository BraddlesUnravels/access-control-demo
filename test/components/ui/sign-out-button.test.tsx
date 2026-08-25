import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { SignOutButton } from '@/components/ui/sign-out-button';

const signOutMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  signOutAction: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  serverRequestClient: async () => ({
    auth: {
      getUser: signOutMocks.getUser,
    },
  }),
}));

vi.mock('@/app/auth/actions', () => ({
  signOutAction: signOutMocks.signOutAction,
}));

beforeEach(() => {
  vi.clearAllMocks();

  signOutMocks.getUser.mockResolvedValue({
    data: {
      user: {
        email: 'student1@lms.com',
      },
    },
  });
});

afterEach(async () => {
  await page.viewport(1280, 720);
});

test('should show the authenticated user and sign-out action', async () => {
  const screen = await render(await SignOutButton());

  await expect.element(screen.getByText('student1@lms.com')).toBeVisible();

  await expect
    .element(screen.getByRole('button', { name: 'Sign out' }))
    .toBeVisible();
});

test('should use a fallback label when the user email is unavailable', async () => {
  signOutMocks.getUser.mockResolvedValue({
    data: {
      user: null,
    },
  });

  const screen = await render(await SignOutButton());

  await expect.element(screen.getByText('Unknown user')).toBeVisible();

  await expect
    .element(screen.getByRole('button', { name: 'Sign out' }))
    .toBeVisible();
});

test('should keep long account details within a narrow viewport', async () => {
  const longEmail = 'very.long.student.account@lms.example.com';

  signOutMocks.getUser.mockResolvedValue({
    data: {
      user: {
        email: longEmail,
      },
    },
  });

  await page.viewport(320, 720);

  const screen = await render(await SignOutButton());
  const email = screen.getByText(longEmail).element();
  const signOutGroup = email.closest('#app-sign-out');

  expect(signOutGroup).not.toBeNull();
  expect(signOutGroup?.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
});
