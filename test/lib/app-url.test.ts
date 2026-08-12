import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildAppUrl, getAppOrigin } from '@/lib/app-url';

const AZURE_CONTAINER_APP_NAME = 'aca-access-control-demo';

const AZURE_ENV_DNS_SUFFIX = 'example.australiaeast.azurecontainerapps.io';

const CUSTOM_DOMAIN = 'braddlesunravels.online';

/*
 * RFC 5737 TEST-NET address.
 *
 * Use a real syntactically valid IP in tests rather than
 * placeholders such as "<LAN-IP>".
 */
const LOCAL_NETWORK_ORIGIN = 'http://192.0.2.10:3000';

describe('lib/app-url', () => {
  beforeEach(() => {
    /*
     * Start every test outside Azure.
     *
     * Azure-specific tests explicitly opt into the
     * Container Apps environment below.
     */
    vi.stubEnv('CONTAINER_APP_NAME', '');

    vi.stubEnv('CONTAINER_APP_ENV_DNS_SUFFIX', '');

    vi.stubEnv('AZURE_CUSTOM_DOMAIN', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  /*
   * Regression:
   *
   * A local request made through another machine/device
   * on the network must preserve its incoming origin.
   *
   * Previously this was incorrectly rewritten to
   * http://localhost:3000.
   */
  it('should preserve the incoming origin outside Azure instead of forcing localhost', () => {
    const request = new NextRequest(`${LOCAL_NETWORK_ORIGIN}/auth/confirm`);

    expect(getAppOrigin(request)).toBe(LOCAL_NETWORK_ORIGIN);
  });

  it('should preserve a custom local development port', () => {
    const request = new NextRequest('http://localhost:4567/auth/confirm');

    expect(getAppOrigin(request)).toBe('http://localhost:4567');
  });

  it('should use localhost only when no request or Azure origin is available', () => {
    expect(getAppOrigin()).toBe('http://localhost:3000');
  });

  /*
   * Regression:
   *
   * Azure exposes the application internally on
   * 0.0.0.0:3000. That internal bind address must never
   * appear in a public redirect.
   */
  it('should use the Azure custom domain instead of leaking the internal container origin', () => {
    vi.stubEnv('CONTAINER_APP_NAME', AZURE_CONTAINER_APP_NAME);

    vi.stubEnv('CONTAINER_APP_ENV_DNS_SUFFIX', AZURE_ENV_DNS_SUFFIX);

    vi.stubEnv('AZURE_CUSTOM_DOMAIN', CUSTOM_DOMAIN);

    const request = new NextRequest('http://0.0.0.0:3000/auth/confirm');

    const result = buildAppUrl(request, '/auth/login');

    expect(result.toString()).toBe(
      'https://braddlesunravels.online/auth/login',
    );

    expect(result.hostname).not.toBe('0.0.0.0');
  });

  /*
   * Resilience:
   *
   * Losing the custom-domain environment variable should
   * still produce a valid public Azure URL rather than
   * falling back to the container bind address.
   */
  it('should fall back to the Azure-generated FQDN when the custom domain is unavailable', () => {
    vi.stubEnv('CONTAINER_APP_NAME', AZURE_CONTAINER_APP_NAME);

    vi.stubEnv('CONTAINER_APP_ENV_DNS_SUFFIX', AZURE_ENV_DNS_SUFFIX);

    const request = new NextRequest('http://0.0.0.0:3000/auth/confirm');

    expect(getAppOrigin(request)).toBe(
      'https://aca-access-control-demo.example.australiaeast.azurecontainerapps.io',
    );
  });

  /*
   * Regression protection:
   *
   * Partial Azure metadata must not incorrectly classify
   * an ordinary request as a usable Azure environment.
   */
  it('should use the incoming request origin when Azure metadata is incomplete', () => {
    vi.stubEnv('CONTAINER_APP_NAME', AZURE_CONTAINER_APP_NAME);

    const request = new NextRequest(`${LOCAL_NETWORK_ORIGIN}/auth/confirm`);

    expect(getAppOrigin(request)).toBe(LOCAL_NETWORK_ORIGIN);
  });

  it('should build application URLs from the resolved origin', () => {
    const request = new NextRequest(`${LOCAL_NETWORK_ORIGIN}/auth/confirm`);

    expect(buildAppUrl(request, '/protected').toString()).toBe(
      `${LOCAL_NETWORK_ORIGIN}/protected`,
    );
  });

  it('should reject a malformed Azure custom domain', () => {
    vi.stubEnv('CONTAINER_APP_NAME', AZURE_CONTAINER_APP_NAME);

    vi.stubEnv('CONTAINER_APP_ENV_DNS_SUFFIX', AZURE_ENV_DNS_SUFFIX);

    vi.stubEnv('AZURE_CUSTOM_DOMAIN', 'braddlesunravels.online/path');

    const request = new NextRequest('http://0.0.0.0:3000/auth/confirm');

    expect(() => getAppOrigin(request)).toThrow(
      'Application origin must be an absolute HTTP(S) origin without a path.',
    );
  });
});
