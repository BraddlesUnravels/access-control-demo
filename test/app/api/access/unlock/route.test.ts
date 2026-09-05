import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/access/unlock/route';
import {
  ACCESS_GATE_CONTACT_EMAIL,
  ACCESS_GATE_COOKIE_NAME,
  ACCESS_GATE_REQUEST_TOKENS_URL,
} from '@/lib/access-gate/constants';
import { verifyAccessGateCookieValue } from '@/lib/access-gate/cookie';
import { getClientIdentifier } from '@/lib/rate-limiter/client';
import { consumeRateLimit } from '@/lib/rate-limiter/in-memory';
import { serverRequestClient } from '@/lib/supabase/server';

vi.mock('@/lib/rate-limiter/client', () => ({
  getClientIdentifier: vi.fn(),
}));

vi.mock('@/lib/rate-limiter/in-memory', () => ({
  consumeRateLimit: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  serverRequestClient: vi.fn(),
}));

const CODE_SECRET = 'test-access-gate-code-secret-1234567890';

const COOKIE_SECRET = 'test-access-gate-cookie-secret-1234567890';

const EXPIRES_AT = '2099-08-22T00:00:00.000Z';

const EXPECTED_CODE_HASH =
  '0b26814a8b157f7288e7964c57c7e37715b35fae874572a32d72bff7793c88f5';

const EMPTY_CONTEXT = {
  params: Promise.resolve({}),
};

type RpcResult = {
  data: unknown;
  error: {
    code?: string;
    message: string;
  } | null;
};

const setupRpcMock = (rpcResult: RpcResult) => {
  const rpc = vi.fn().mockResolvedValue(rpcResult);

  vi.mocked(serverRequestClient).mockResolvedValue({
    rpc,
  } as never);

  return rpc;
};

const buildRequest = (body: string): Request => {
  return new Request('http://localhost/api/access/unlock', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
  });
};

describe('app/api/access/unlock/route', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(getClientIdentifier).mockReturnValue('client-a');

    vi.mocked(consumeRateLimit).mockReturnValue({
      allowed: true,
      remaining: 4,
      retryAfterSeconds: 60,
    });

    vi.stubEnv('ACCESS_GATE_CODE_SECRET', CODE_SECRET);
    vi.stubEnv('ACCESS_GATE_COOKIE_SECRET', COOKIE_SECRET);
    vi.stubEnv('CONTAINER_APP_NAME', '');
    vi.stubEnv('CONTAINER_APP_ENV_DNS_SUFFIX', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should return 429 before parsing the request or calling Supabase when the rate limit is exceeded', async () => {
    const request = buildRequest('{invalid-json');

    vi.mocked(getClientIdentifier).mockReturnValue('203.0.113.10');

    vi.mocked(consumeRateLimit).mockReturnValue({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 37,
    });

    const response = await POST(request, EMPTY_CONTEXT);

    expect(getClientIdentifier).toHaveBeenCalledTimes(1);
    expect(getClientIdentifier).toHaveBeenCalledWith(request);

    expect(consumeRateLimit).toHaveBeenCalledTimes(1);
    expect(consumeRateLimit).toHaveBeenCalledWith('203.0.113.10');

    expect(response.status).toBe(429);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('retry-after')).toBe('37');

    await expect(response.json()).resolves.toEqual({
      error: 'Too many requests. Please try again later.',
      contactEmail: ACCESS_GATE_CONTACT_EMAIL,
      requestTokensUrl: ACCESS_GATE_REQUEST_TOKENS_URL,
    });

    expect(serverRequestClient).not.toHaveBeenCalled();
  });

  it('should reject malformed JSON with 400 without calling Supabase', async () => {
    const response = await POST(buildRequest('{invalid-json'), EMPTY_CONTEXT);

    expect(response.status).toBe(400);

    await expect(response.json()).resolves.toEqual({
      error: 'Request body must be valid JSON',
    });

    expect(serverRequestClient).not.toHaveBeenCalled();
  });

  it('should reject a missing invite code with validation details', async () => {
    const response = await POST(
      buildRequest(JSON.stringify({})),
      EMPTY_CONTEXT,
    );

    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toBe('no-store');

    await expect(response.json()).resolves.toMatchObject({
      error: 'Invite code is required',
      contactEmail: ACCESS_GATE_CONTACT_EMAIL,
      requestTokensUrl: ACCESS_GATE_REQUEST_TOKENS_URL,
    });

    expect(serverRequestClient).not.toHaveBeenCalled();
  });

  it('should reject an invite code outside the accepted length bounds', async () => {
    const response = await POST(
      buildRequest(
        JSON.stringify({
          code: 'short',
        }),
      ),
      EMPTY_CONTEXT,
    );

    expect(response.status).toBe(400);

    await expect(response.json()).resolves.toMatchObject({
      error: 'Invite code is invalid',
    });

    expect(serverRequestClient).not.toHaveBeenCalled();
  });

  it('should hash the submitted code and call the one-argument redemption RPC', async () => {
    const rpc = setupRpcMock({
      data: [
        {
          reason: 'invalid',
        },
      ],
      error: null,
    });

    await POST(
      buildRequest(
        JSON.stringify({
          code: '  acd-test-code  ',
        }),
      ),
      EMPTY_CONTEXT,
    );

    expect(rpc).toHaveBeenCalledTimes(1);

    expect(rpc).toHaveBeenCalledWith('redeem_access_invite', {
      p_code_hash: EXPECTED_CODE_HASH,
    });
  });

  it('should return 401 for an invalid invite', async () => {
    setupRpcMock({
      data: [
        {
          invite_id: null,
          visit_id: null,
          label: null,
          access_expires_at: null,
          reason: 'invalid',
        },
      ],
      error: null,
    });

    const response = await POST(
      buildRequest(
        JSON.stringify({
          code: 'ACD-TEST-CODE',
        }),
      ),
      EMPTY_CONTEXT,
    );

    expect(response.status).toBe(401);
    expect(response.headers.get('cache-control')).toBe('no-store');

    await expect(response.json()).resolves.toEqual({
      error: 'Invite code is invalid.',
      reason: 'invalid',
      contactEmail: ACCESS_GATE_CONTACT_EMAIL,
      requestTokensUrl: ACCESS_GATE_REQUEST_TOKENS_URL,
    });
  });

  it('should return 403 for an expired invite', async () => {
    setupRpcMock({
      data: [
        {
          invite_id: '11111111-1111-4111-8111-111111111111',
          visit_id: null,
          label: 'Expired invite',
          access_expires_at: '2026-08-01T00:00:00.000Z',
          reason: 'expired',
        },
      ],
      error: null,
    });

    const response = await POST(
      buildRequest(
        JSON.stringify({
          code: 'ACD-TEST-CODE',
        }),
      ),
      EMPTY_CONTEXT,
    );

    expect(response.status).toBe(403);

    await expect(response.json()).resolves.toMatchObject({
      error: 'This invite code has expired.',
      reason: 'expired',
    });
  });

  it('should return 403 for a revoked invite', async () => {
    setupRpcMock({
      data: [
        {
          invite_id: '11111111-1111-4111-8111-111111111111',
          visit_id: null,
          label: 'Revoked invite',
          access_expires_at: null,
          reason: 'revoked',
        },
      ],
      error: null,
    });

    const response = await POST(
      buildRequest(
        JSON.stringify({
          code: 'ACD-TEST-CODE',
        }),
      ),
      EMPTY_CONTEXT,
    );

    expect(response.status).toBe(403);

    await expect(response.json()).resolves.toMatchObject({
      error: 'This invite code is no longer valid.',
      reason: 'revoked',
    });
  });

  it('should return a safe 500 when Supabase reports an RPC error', async () => {
    setupRpcMock({
      data: null,
      error: {
        code: 'PGRST202',
        message: 'RPC unavailable',
      },
    });

    const response = await POST(
      buildRequest(
        JSON.stringify({
          code: 'ACD-TEST-CODE',
        }),
      ),
      EMPTY_CONTEXT,
    );

    expect(response.status).toBe(500);

    await expect(response.json()).resolves.toEqual({
      error: 'Unable to verify invite code',
    });
  });

  it('should treat an empty RPC result as an internal contract failure', async () => {
    setupRpcMock({
      data: [],
      error: null,
    });

    const response = await POST(
      buildRequest(
        JSON.stringify({
          code: 'ACD-TEST-CODE',
        }),
      ),
      EMPTY_CONTEXT,
    );

    expect(response.status).toBe(500);

    await expect(response.json()).resolves.toEqual({
      error: 'Unable to verify invite code',
    });
  });

  it('should reject an unsupported RPC reason as an internal contract failure', async () => {
    setupRpcMock({
      data: [
        {
          invite_id: null,
          visit_id: null,
          label: null,
          access_expires_at: null,
          reason: 'unexpected-reason',
        },
      ],
      error: null,
    });

    const response = await POST(
      buildRequest(
        JSON.stringify({
          code: 'ACD-TEST-CODE',
        }),
      ),
      EMPTY_CONTEXT,
    );

    expect(response.status).toBe(500);

    await expect(response.json()).resolves.toEqual({
      error: 'Unable to verify invite code',
    });
  });

  it('should reject an incomplete successful RPC result without setting a cookie', async () => {
    setupRpcMock({
      data: [
        {
          invite_id: '11111111-1111-4111-8111-111111111111',
          visit_id: '22222222-2222-4222-8222-222222222222',
          label: 'Acme recruiter',
          access_expires_at: null,
          reason: 'ok',
        },
      ],
      error: null,
    });

    const response = await POST(
      buildRequest(
        JSON.stringify({
          code: 'ACD-TEST-CODE',
        }),
      ),
      EMPTY_CONTEXT,
    );

    expect(response.status).toBe(500);
    expect(response.cookies.get(ACCESS_GATE_COOKIE_NAME)).toBeUndefined();

    await expect(response.json()).resolves.toEqual({
      error: 'Unable to verify invite code',
    });
  });

  it('should reject a successful RPC result whose access expiry has already passed', async () => {
    setupRpcMock({
      data: [
        {
          invite_id: '11111111-1111-4111-8111-111111111111',
          visit_id: '22222222-2222-4222-8222-222222222222',
          label: 'Acme recruiter',
          access_expires_at: '2020-01-01T00:00:00.000Z',
          reason: 'ok',
        },
      ],
      error: null,
    });

    const response = await POST(
      buildRequest(
        JSON.stringify({
          code: 'ACD-TEST-CODE',
        }),
      ),
      EMPTY_CONTEXT,
    );

    expect(response.status).toBe(500);
    expect(response.cookies.get(ACCESS_GATE_COOKIE_NAME)).toBeUndefined();

    await expect(response.json()).resolves.toEqual({
      error: 'Unable to verify invite code',
    });
  });

  it('should set a signed cookie using the database-controlled absolute expiry', async () => {
    setupRpcMock({
      data: [
        {
          invite_id: '11111111-1111-4111-8111-111111111111',
          visit_id: '22222222-2222-4222-8222-222222222222',
          label: 'Acme recruiter',
          access_expires_at: EXPIRES_AT,
          reason: 'ok',
        },
      ],
      error: null,
    });

    const response = await POST(
      buildRequest(
        JSON.stringify({
          code: 'ACD-TEST-CODE',
        }),
      ),
      EMPTY_CONTEXT,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');

    await expect(response.json()).resolves.toEqual({
      data: {
        label: 'Acme recruiter',
        expiresAt: EXPIRES_AT,
      },
    });

    const cookie = response.cookies.get(ACCESS_GATE_COOKIE_NAME);

    expect(cookie?.value).toBeTruthy();
    expect((cookie?.expires as Date)?.toISOString()).toBe(EXPIRES_AT);

    expect(
      verifyAccessGateCookieValue(
        cookie?.value ?? '',
        COOKIE_SECRET,
        Date.parse('2099-08-21T00:00:00.000Z'),
      ),
    ).toEqual({
      version: 2,
      inviteId: '11111111-1111-4111-8111-111111111111',
      visitId: '22222222-2222-4222-8222-222222222222',
      exp: Math.floor(Date.parse(EXPIRES_AT) / 1000),
    });
  });

  it('should mark the access cookie Secure when running in Azure', async () => {
    vi.stubEnv('CONTAINER_APP_NAME', 'aca-access-control-demo');

    vi.stubEnv(
      'CONTAINER_APP_ENV_DNS_SUFFIX',
      'example.australiaeast.azurecontainerapps.io',
    );

    setupRpcMock({
      data: [
        {
          invite_id: '11111111-1111-4111-8111-111111111111',
          visit_id: '22222222-2222-4222-8222-222222222222',
          label: 'Acme recruiter',
          access_expires_at: EXPIRES_AT,
          reason: 'ok',
        },
      ],
      error: null,
    });

    const response = await POST(
      new Request('https://example.com/api/access/unlock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: 'ACD-TEST-CODE',
        }),
      }),
      EMPTY_CONTEXT,
    );

    const setCookie = response.headers.get('set-cookie')?.toLowerCase() ?? '';

    expect(setCookie).toContain('secure');
    expect(setCookie).toContain('httponly');
    expect(setCookie).toContain('samesite=lax');
  });
});
