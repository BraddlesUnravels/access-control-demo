import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL;
const accessGateCookie = process.env.ACCESS_GATE_COOKIE;

if (!baseUrl) {
  throw new Error('BASE_URL is required for the browser smoke test.');
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const browserErrors = [];

page.on('console', (message) => {
  if (message.type() === 'error') browserErrors.push(message.text());
});
page.on('pageerror', (error) => browserErrors.push(error.message));

if (accessGateCookie) {
  await context.addCookies([
    {
      name: 'access_gate',
      value: accessGateCookie,
      url: baseUrl,
    },
  ]);
}

try {
  await page.goto(`${baseUrl}/auth/login`, { waitUntil: 'networkidle' });

  const accountButton = page
    .getByRole('button', { name: 'Use this account' })
    .first();
  await accountButton.click();

  const emailInput = page.locator('#email');
  const passwordInput = page.locator('#password');
  await emailInput.waitFor({ state: 'visible' });
  await passwordInput.waitFor({ state: 'visible' });

  if (!(await emailInput.inputValue()) || !(await passwordInput.inputValue())) {
    throw new Error(
      'Selecting a demo account did not populate the login form.',
    );
  }

  const showPasswordButton = page.getByRole('button', {
    name: 'Show password',
  });
  await showPasswordButton.click();

  if ((await passwordInput.getAttribute('type')) !== 'text') {
    throw new Error('Password visibility control did not reveal the password.');
  }

  await page.getByRole('button', { name: 'Hide password' }).click();

  if ((await passwordInput.getAttribute('type')) !== 'password') {
    throw new Error('Password visibility control did not hide the password.');
  }

  if (browserErrors.length > 0) {
    throw new Error(`Browser errors detected:\n${browserErrors.join('\n')}`);
  }

  process.stdout.write('Production browser smoke test passed.\n');
} finally {
  await browser.close();
}
