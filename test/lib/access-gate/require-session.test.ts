import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  hasValidAccessGateSession,
  requireAccessGateSession,
} from '@/lib/access-gate/require-session';
import { createAccessGateCookieValue } from '@/lib/access-gate/cookie';
import { ACCESS_GATE_COOKIE_NAME } from '@/lib/access-gate/constants';

const COOKIE_SECRET = 'a'.repeat(32);
const INVITE_ID = '00000000-1111-4111-8111-111111111111';
const VISIT_ID = '00000000-2222-4111-8111-111111111111';

const getCookiesMock = vi.hoisted(() => vi.fn());
const hasValidSessionMock = vi.hoisted(() => vi.fn());

vi.mock('next/headers', () => ({
  cookies: () => getCookiesMock(),
}));

vi.mock('@/lib/access-gate/session-cache', () => ({
  accessGateSessionCache: {
    hasValidSession: hasValidSessionMock,
  },
}));

const setCookieValue = (value: string | undefined) => {
  getCookiesMock.mockResolvedValue({
    get: (name: string) =>
      name === ACCESS_GATE_COOKIE_NAME && value ? { value } : undefined,
  });
};

describe('lib/access-gate/require-session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('ACCESS_GATE_DISABLED', '');
    vi.stubEnv('ACCESS_GATE_COOKIE_SECRET', COOKIE_SECRET);
    hasValidSessionMock.mockReturnValue(true);
  });

  it('should return false when no cookie is present', async () => {
    setCookieValue(undefined);

    await expect(hasValidAccessGateSession()).resolves.toBe(false);
    expect(hasValidSessionMock).not.toHaveBeenCalled();
  });

  it('should return false when the cookie signature is invalid', async () => {
    setCookieValue('not-a-valid-cookie');

    await expect(hasValidAccessGateSession()).resolves.toBe(false);
    expect(hasValidSessionMock).not.toHaveBeenCalled();
  });

  it('should return false when the cookie secret is not configured', async () => {
    vi.stubEnv('ACCESS_GATE_COOKIE_SECRET', '');
    setCookieValue(
      createAccessGateCookieValue(
        { inviteId: INVITE_ID, visitId: VISIT_ID },
        COOKIE_SECRET,
        Date.now() + 60_000,
      ),
    );

    await expect(hasValidAccessGateSession()).resolves.toBe(false);
  });

  it('should return false when fresh session validation fails', async () => {
    hasValidSessionMock.mockResolvedValue(false);
    setCookieValue(
      createAccessGateCookieValue(
        { inviteId: INVITE_ID, visitId: VISIT_ID },
        COOKIE_SECRET,
        Date.now() + 60_000,
      ),
    );

    await expect(hasValidAccessGateSession()).resolves.toBe(false);
    expect(hasValidSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({ inviteId: INVITE_ID, visitId: VISIT_ID }),
    );
  });

  it('should validate a cookie when its cache entry was evicted', async () => {
    hasValidSessionMock.mockResolvedValue(true);
    setCookieValue(
      createAccessGateCookieValue(
        { inviteId: INVITE_ID, visitId: VISIT_ID },
        COOKIE_SECRET,
        Date.now() + 60_000,
      ),
    );

    await expect(hasValidAccessGateSession()).resolves.toBe(true);
    expect(hasValidSessionMock).toHaveBeenCalledOnce();
  });

  it('should return true for a valid cookie with a cached valid session', async () => {
    setCookieValue(
      createAccessGateCookieValue(
        { inviteId: INVITE_ID, visitId: VISIT_ID },
        COOKIE_SECRET,
        Date.now() + 60_000,
      ),
    );

    await expect(hasValidAccessGateSession()).resolves.toBe(true);
    expect(hasValidSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({ inviteId: INVITE_ID, visitId: VISIT_ID }),
    );
  });

  it('should bypass the check when the access gate is disabled locally', async () => {
    vi.stubEnv('ACCESS_GATE_DISABLED', 'true');
    setCookieValue(undefined);

    await expect(hasValidAccessGateSession()).resolves.toBe(true);
    expect(hasValidSessionMock).not.toHaveBeenCalled();
  });

  describe('requireAccessGateSession', () => {
    it('should throw a 401 AppError when the session is invalid', async () => {
      setCookieValue(undefined);

      await expect(requireAccessGateSession()).rejects.toMatchObject({
        status: 401,
        safeMessage: 'Access invite is required.',
      });
    });

    it('should resolve without throwing when the session is valid', async () => {
      setCookieValue(
        createAccessGateCookieValue(
          { inviteId: INVITE_ID, visitId: VISIT_ID },
          COOKIE_SECRET,
          Date.now() + 60_000,
        ),
      );

      await expect(requireAccessGateSession()).resolves.toBeUndefined();
    });
  });
});
