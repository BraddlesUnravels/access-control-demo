import { describe, expect, it } from 'vitest';
import {
  createAccessGateCookieValue,
  verifyAccessGateCookieValue,
} from '@/lib/access-gate/cookie';
import { hashInviteCode, normalizeInviteCode } from '@/lib/access-gate/hash';
import { isAccessGatePublicPath } from '@/lib/access-gate/paths';

describe('lib/access-gate/hash', () => {
  describe('normalizeInviteCode', () => {
    it('should trim, uppercase, and remove spaces', () => {
      expect(normalizeInviteCode('  acd-ab12 cd34  ')).toBe('ACD-AB12CD34');
    });
  });

  describe('hashInviteCode', () => {
    it('should hash normalized codes consistently', () => {
      const secret = 'test-secret';

      expect(hashInviteCode('acd-ab12-cd34', secret)).toBe(
        hashInviteCode('ACD-AB12-CD34', secret),
      );
      expect(hashInviteCode('ACD-AB12-CD34', secret)).not.toBe(
        hashInviteCode('ACD-AB12-CD35', secret),
      );
    });
  });
});

describe('lib/access-gate/cookie', () => {
  const secret = 'cookie-secret';
  const nowMs = Date.parse('2026-08-05T12:00:00.000Z');

  it('should round-trip a signed access gate cookie', () => {
    const value = createAccessGateCookieValue(
      {
        visitId: 'visit-1',
        inviteId: 'invite-1',
        label: 'Acme recruiter',
      },
      secret,
      nowMs,
    );

    expect(verifyAccessGateCookieValue(value, secret, nowMs)).toEqual({
      visitId: 'visit-1',
      inviteId: 'invite-1',
      label: 'Acme recruiter',
      exp: Math.floor(nowMs / 1000) + 60 * 60 * 24 * 7,
    });
  });

  it('should reject tampered signatures', () => {
    const value = createAccessGateCookieValue(
      {
        visitId: 'visit-1',
        inviteId: 'invite-1',
        label: 'Acme recruiter',
      },
      secret,
      nowMs,
    );

    expect(
      verifyAccessGateCookieValue(`${value}tampered`, secret, nowMs),
    ).toBeUndefined();
  });

  it('should reject expired cookies', () => {
    const value = createAccessGateCookieValue(
      {
        visitId: 'visit-1',
        inviteId: 'invite-1',
        label: 'Acme recruiter',
      },
      secret,
      nowMs,
    );
    const eightDaysLater = nowMs + 1000 * 60 * 60 * 24 * 8;

    expect(
      verifyAccessGateCookieValue(value, secret, eightDaysLater),
    ).toBeUndefined();
  });
});

describe('lib/access-gate/paths', () => {
  describe('isAccessGatePublicPath', () => {
    it('should allow access and health routes', () => {
      expect(isAccessGatePublicPath('/access')).toBe(true);
      expect(isAccessGatePublicPath('/api/access/unlock')).toBe(true);
      expect(isAccessGatePublicPath('/api/health')).toBe(true);
    });

    it('should deny protected application routes', () => {
      expect(isAccessGatePublicPath('/auth/login')).toBe(false);
      expect(isAccessGatePublicPath('/protected')).toBe(false);
      expect(isAccessGatePublicPath('/api/consultations')).toBe(false);
    });
  });
});
