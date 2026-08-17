export class CookieJar {
  constructor(entries = []) {
    this.cookies = new Map(entries);
  }

  clone() {
    return new CookieJar(this.cookies.entries());
  }

  set(name, value) {
    if (!value) {
      this.cookies.delete(name);
      return;
    }

    this.cookies.set(name, value);
  }

  get(name) {
    return this.cookies.get(name);
  }

  applySetCookieHeaders(headers) {
    const setCookieHeaders =
      typeof headers.getSetCookie === 'function'
        ? headers.getSetCookie()
        : [headers.get('set-cookie')].filter(Boolean);

    for (const setCookieHeader of setCookieHeaders) {
      const cookiePair = setCookieHeader.split(';', 1)[0];
      const separatorIndex = cookiePair.indexOf('=');

      if (separatorIndex <= 0) continue;

      const name = cookiePair.slice(0, separatorIndex).trim();
      const value = cookiePair.slice(separatorIndex + 1).trim();

      this.set(name, value);
    }
  }

  toRequestHeader() {
    return [...this.cookies.entries()]
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }
}

export const waitForHealth = async (url) => {
  const attempts = 40;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(4_000),
      });

      if (response.ok) {
        const body = await response.json();

        if (body.status === 'ok') return;
      }
    } catch {
      // The application container may still be starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 1_500));
  }

  throw new Error(`Application did not become healthy at ${url}.`);
};

const request = async (url, init = {}, cookieJar) => {
  const headers = new Headers(init.headers);
  const cookieHeader = cookieJar?.toRequestHeader();

  if (cookieHeader) {
    headers.set('Cookie', cookieHeader);
  }

  const response = await fetch(url, {
    ...init,
    headers,
    redirect: 'manual',
    signal: AbortSignal.timeout(5_000),
  });

  cookieJar?.applySetCookieHeaders(response.headers);

  return response;
};

export const assertStatus = async (
  url,
  expectedStatus,
  init = {},
  cookieJar = undefined,
) => {
  const response = await request(url, init, cookieJar);

  if (response.status !== expectedStatus) {
    const body = await response.text();

    throw new Error(
      `Expected ${url} to return ${expectedStatus}, received ${response.status}. Body: ${body}`,
    );
  }

  return response;
};

export const assertJson = async (
  url,
  expectedStatus,
  init = {},
  cookieJar = undefined,
) => {
  const response = await assertStatus(url, expectedStatus, init, cookieJar);

  return await response.json();
};

export const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};
