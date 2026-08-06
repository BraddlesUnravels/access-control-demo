import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/access/unlock/route';
import { ACCESS_GATE_COOKIE_NAME } from '@/lib/access-gate/constants';
import { serverRequestClient } from '@/lib/supabase/server';

vi.mock('@/lib/supabase/server', () => ({
  serverRequestClient: vi.fn(),
}));

const setupRpcMock = (rpcResult: {
  data: unknown;
  error: { code?: string; message: string } | null;
}) => {
  const rpc = vi.fn().mockResolvedValue(rpcResult);

  vi.mocked(serverRequestClient).mockResolvedValue({
    rpc,
  } as never);

  return { rpc };
};

describe('app/api/access/unlock/route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ACCESS_GATE_CODE_SECRET = 'test-access-gate-secret';
  });

  const emptyContext = { params: Promise.resolve({}) };

  it('should reject missing invite codes with 400', async () => {
    const response = await POST(
      new Request('http://localhost/api/access/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
      emptyContext,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Invite code is required',
    });
  });

  it('should set a gate cookie when redeem succeeds', async () => {
    const { rpc } = setupRpcMock({
      data: [
        {
          invite_id: 'invite-1',
          visit_id: 'visit-1',
          label: 'Acme recruiter',
          reason: 'ok',
        },
      ],
      error: null,
    });

    const response = await POST(
      new Request('http://localhost/api/access/unlock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-agent': 'vitest',
        },
        body: JSON.stringify({ code: 'ACD-TEST-CODE' }),
      }),
      emptyContext,
    );

    expect(rpc).toHaveBeenCalledWith(
      'redeem_access_invite',
      expect.objectContaining({
        p_user_agent: 'vitest',
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: { label: 'Acme recruiter' },
    });
    expect(response.cookies.get(ACCESS_GATE_COOKIE_NAME)?.value).toBeTruthy();
  });

  it('should return expired help payload for expired codes', async () => {
    setupRpcMock({
      data: [
        {
          invite_id: 'invite-2',
          visit_id: null,
          label: 'Old invite',
          reason: 'expired',
        },
      ],
      error: null,
    });

    const response = await POST(
      new Request('http://localhost/api/access/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'ACD-OLD-CODE' }),
      }),
      emptyContext,
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: 'This invite code has expired.',
      reason: 'expired',
      contactEmail: 'tidemaster2@gmail.com',
    });
  });

  it('should return invalid for unknown codes', async () => {
    setupRpcMock({
      data: [
        {
          invite_id: null,
          visit_id: null,
          label: null,
          reason: 'invalid',
        },
      ],
      error: null,
    });

    const response = await POST(
      new Request('http://localhost/api/access/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'ACD-BAD-CODE' }),
      }),
      emptyContext,
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Invite code is invalid.',
      reason: 'invalid',
    });
  });
});
