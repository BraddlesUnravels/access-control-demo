import { describe, expect, it } from 'vitest';
import {
  getSafeAccessGateDestination,
  isAccessGatePublicPath,
} from '@/lib/access-gate/paths';

describe('lib/access-gate/paths', () => {
  describe('isAccessGatePublicPath', () => {
    it('allows the root gate and public infrastructure routes', () => {
      expect(isAccessGatePublicPath('/')).toBe(true);

      expect(isAccessGatePublicPath('/api/access')).toBe(true);

      expect(isAccessGatePublicPath('/api/access/unlock')).toBe(true);

      expect(isAccessGatePublicPath('/api/health')).toBe(true);

      expect(isAccessGatePublicPath('/auth/confirm')).toBe(true);

      expect(isAccessGatePublicPath('/auth/confirm-email')).toBe(true);
    });

    it('normalizes case and surrounding whitespace before matching', () => {
      expect(isAccessGatePublicPath('  /API/ACCESS/UNLOCK  ')).toBe(true);

      expect(isAccessGatePublicPath('  /AUTH/CONFIRM-EMAIL  ')).toBe(true);
    });

    it('does not treat similarly named or legacy routes as public', () => {
      expect(isAccessGatePublicPath('/access')).toBe(false);

      expect(isAccessGatePublicPath('/api/accessory')).toBe(false);

      expect(isAccessGatePublicPath('/api/healthcheck')).toBe(false);

      expect(isAccessGatePublicPath('/auth/confirmation')).toBe(false);
    });

    it('denies protected application routes', () => {
      expect(isAccessGatePublicPath('/auth/login')).toBe(false);

      expect(isAccessGatePublicPath('/protected')).toBe(false);

      expect(isAccessGatePublicPath('/api/consultations')).toBe(false);
    });
  });

  describe('getSafeAccessGateDestination', () => {
    it('preserves safe internal destinations, query strings, and fragments', () => {
      expect(
        getSafeAccessGateDestination('/protected?tab=consultations#upcoming'),
      ).toBe('/protected?tab=consultations#upcoming');
    });

    it('defaults when no destination is supplied', () => {
      expect(getSafeAccessGateDestination(undefined)).toBe('/auth/login');

      expect(getSafeAccessGateDestination(null)).toBe('/auth/login');

      expect(getSafeAccessGateDestination('')).toBe('/auth/login');
    });

    it('rejects external and protocol-relative destinations', () => {
      expect(getSafeAccessGateDestination('https://example.com')).toBe(
        '/auth/login',
      );

      expect(getSafeAccessGateDestination('//example.com')).toBe('/auth/login');
    });

    it('rejects destinations that loop back to the gate or target APIs', () => {
      expect(getSafeAccessGateDestination('/')).toBe('/auth/login');

      expect(getSafeAccessGateDestination('/api')).toBe('/auth/login');

      expect(getSafeAccessGateDestination('/api/consultations')).toBe(
        '/auth/login',
      );
    });
  });
});
