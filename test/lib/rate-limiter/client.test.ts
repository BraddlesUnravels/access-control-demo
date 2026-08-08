import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getClientIdentifier } from '@/lib/rate-limiter/client';

const enableAzureEnvironment = () => {
  vi.stubEnv('CONTAINER_APP_NAME', 'aca-access-control-demo');

  vi.stubEnv(
    'CONTAINER_APP_ENV_DNS_SUFFIX',
    'example.australiaeast.azurecontainerapps.io',
  );
};

describe('getClientIdentifier', () => {
  beforeEach(() => {
    vi.stubEnv('CONTAINER_APP_NAME', '');
    vi.stubEnv('CONTAINER_APP_ENV_DNS_SUFFIX', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should use one shared identifier outside Azure', () => {
    const request = new Request('http://localhost/api/access/unlock');

    expect(getClientIdentifier(request)).toBe('non-azure-client');
  });

  it('should not trust X-Forwarded-For outside Azure', () => {
    const request = new Request('http://localhost/api/access/unlock', {
      headers: {
        'x-forwarded-for': '203.0.113.10',
      },
    });

    expect(getClientIdentifier(request)).toBe('non-azure-client');
  });

  it('should use the Azure-provided X-Forwarded-For address', () => {
    enableAzureEnvironment();

    const request = new Request('https://example.com/api/access/unlock', {
      headers: {
        'x-forwarded-for': '203.0.113.10',
      },
    });

    expect(getClientIdentifier(request)).toBe('203.0.113.10');
  });

  it('should use only the rightmost X-Forwarded-For address in Azure', () => {
    enableAzureEnvironment();

    const request = new Request('https://example.com/api/access/unlock', {
      headers: {
        'x-forwarded-for': '198.51.100.20, 192.0.2.30, 203.0.113.10',
      },
    });

    expect(getClientIdentifier(request)).toBe('203.0.113.10');
  });

  it('should trim whitespace from the rightmost forwarded address', () => {
    enableAzureEnvironment();

    const request = new Request('https://example.com/api/access/unlock', {
      headers: {
        'x-forwarded-for': '198.51.100.20,   203.0.113.10   ',
      },
    });

    expect(getClientIdentifier(request)).toBe('203.0.113.10');
  });

  it('should use the unknown Azure bucket when X-Forwarded-For is missing', () => {
    enableAzureEnvironment();

    const request = new Request('https://example.com/api/access/unlock');

    expect(getClientIdentifier(request)).toBe('unknown-azure-client');
  });

  it('should use the unknown Azure bucket when X-Forwarded-For is empty', () => {
    enableAzureEnvironment();

    const request = new Request('https://example.com/api/access/unlock', {
      headers: {
        'x-forwarded-for': '   ',
      },
    });

    expect(getClientIdentifier(request)).toBe('unknown-azure-client');
  });
});
