import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getAccessGateCodeSecret,
  getAccessGateCookieSecret,
  isAccessGateDisabled,
  tryGetAccessGateCookieSecret,
} from '@/lib/access-gate/env';

const VALID_CODE_SECRET = 'c'.repeat(32);
const VALID_COOKIE_SECRET = 'k'.repeat(32);

describe('lib/access-gate/env', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should return configured secrets that meet the minimum length', () => {
    vi.stubEnv('ACCESS_GATE_CODE_SECRET', VALID_CODE_SECRET);
    vi.stubEnv('ACCESS_GATE_COOKIE_SECRET', VALID_COOKIE_SECRET);

    expect(getAccessGateCodeSecret()).toBe(VALID_CODE_SECRET);

    expect(getAccessGateCookieSecret()).toBe(VALID_COOKIE_SECRET);
  });

  it('should reject missing or short secrets', () => {
    vi.stubEnv('ACCESS_GATE_CODE_SECRET', '');
    vi.stubEnv('ACCESS_GATE_COOKIE_SECRET', 'too-short');

    expect(() => getAccessGateCodeSecret()).toThrow(/minimum 32 characters/i);

    expect(() => getAccessGateCookieSecret()).toThrow(/minimum 32 characters/i);

    expect(tryGetAccessGateCookieSecret()).toBeUndefined();
  });

  it('should allow the local bypass only when explicitly enabled outside Azure', () => {
    vi.stubEnv('ACCESS_GATE_DISABLED', 'true');
    vi.stubEnv('CONTAINER_APP_NAME', '');
    vi.stubEnv('CONTAINER_APP_ENV_DNS_SUFFIX', '');

    expect(isAccessGateDisabled()).toBe(true);
  });

  it('should keep the gate enabled when the bypass flag is false', () => {
    vi.stubEnv('ACCESS_GATE_DISABLED', 'false');
    vi.stubEnv('CONTAINER_APP_NAME', '');
    vi.stubEnv('CONTAINER_APP_ENV_DNS_SUFFIX', '');

    expect(isAccessGateDisabled()).toBe(false);
  });

  it('should ignore the bypass flag when running in Azure Container Apps', () => {
    vi.stubEnv('ACCESS_GATE_DISABLED', 'true');
    vi.stubEnv('CONTAINER_APP_NAME', 'aca-access-control-demo');
    vi.stubEnv(
      'CONTAINER_APP_ENV_DNS_SUFFIX',
      'example.australiaeast.azurecontainerapps.io',
    );

    expect(isAccessGateDisabled()).toBe(false);
  });
});
