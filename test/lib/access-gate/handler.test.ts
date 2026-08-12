import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleAccessGateRequest } from '@/lib/access-gate/proxy';

const AZURE_CONTAINER_APP_NAME = 'aca-access-control-demo';

const AZURE_ENV_DNS_SUFFIX = 'example.australiaeast.azurecontainerapps.io';

const CUSTOM_DOMAIN = 'braddlesunravels.online';

describe('lib/access-gate/proxy', () => {
  beforeEach(() => {
    vi.stubEnv('ACCESS_GATE_DISABLED', 'false');

    vi.stubEnv('ACCESS_GATE_COOKIE_SECRET', '');

    vi.stubEnv('CONTAINER_APP_NAME', '');

    vi.stubEnv('CONTAINER_APP_ENV_DNS_SUFFIX', '');

    vi.stubEnv('AZURE_CUSTOM_DOMAIN', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should redirect an unauthenticated local request to the access gate', () => {
    const request = new NextRequest(
      'http://localhost:3000/protected?tab=upcoming',
    );

    const response = handleAccessGateRequest(request);

    expect(response?.status).toBe(307);

    expect(response?.headers.get('location')).toBe(
      'http://localhost:3000/?next=%2Fprotected%3Ftab%3Dupcoming',
    );
  });

  it('should use the custom domain for access-gate redirects in Azure', () => {
    vi.stubEnv('CONTAINER_APP_NAME', AZURE_CONTAINER_APP_NAME);

    vi.stubEnv('CONTAINER_APP_ENV_DNS_SUFFIX', AZURE_ENV_DNS_SUFFIX);

    vi.stubEnv('AZURE_CUSTOM_DOMAIN', CUSTOM_DOMAIN);

    const request = new NextRequest('http://0.0.0.0:3000/protected');

    const response = handleAccessGateRequest(request);

    expect(response?.status).toBe(307);

    expect(response?.headers.get('location')).toBe(
      'https://braddlesunravels.online/?next=%2Fprotected',
    );
  });

  it('should not gate the email confirmation landing page', () => {
    const request = new NextRequest('http://localhost:3000/auth/confirm-email');

    const response = handleAccessGateRequest(request);

    expect(response?.status).toBe(200);

    expect(response?.headers.get('location')).toBeNull();
  });

  it('should not gate the email confirmation POST endpoint', () => {
    const request = new NextRequest('http://localhost:3000/auth/confirm', {
      method: 'POST',
    });

    const response = handleAccessGateRequest(request);

    expect(response?.status).toBe(200);

    expect(response?.headers.get('location')).toBeNull();
  });
});
