import { describe, expect, it } from 'vitest';
import {
  getSafeAccessGateDestination,
  isAccessGatePublicPath,
} from '@/lib/access-gate/paths';

describe('lib/access-gate/paths', () => {
  describe('isAccessGatePublicPath', () => {
    it('should allow the root gate and public infrastructure routes', () => {
      expect(isAccessGatePublicPath('/')).toBe(true);
      expect(isAccessGatePublicPath('/api/access')).toBe(true);
      expect(isAccessGatePublicPath('/api/access/unlock')).toBe(true);
      expect(isAccessGatePublicPath('/api/health')).toBe(true);
    });

    it('should normalize case and surrounding whitespace before matching', () => {
      expect(isAccessGatePublicPath('  /API/ACCESS/UNLOCK  ')).toBe(true);
    });

    it('should not treat similarly named or legacy routes as public', () => {
      expect(isAccessGatePublicPath('/access')).toBe(false);
      expect(isAccessGatePublicPath('/api/accessory')).toBe(false);
      expect(isAccessGatePublicPath('/api/healthcheck')).toBe(false);
    });

    it('should deny protected application routes', () => {
      expect(isAccessGatePublicPath('/auth/login')).toBe(false);
      expect(isAccessGatePublicPath('/protected')).toBe(false);
      expect(isAccessGatePublicPath('/api/consultations')).toBe(false);
    });
  });

  describe('getSafeAccessGateDestination', () => {
    it('should preserve safe internal destinations, query strings, and fragments', () => {
      expect(
        getSafeAccessGateDestination('/protected?tab=consultations#upcoming'),
      ).toBe('/protected?tab=consultations#upcoming');
    });

    it('should default when no destination is supplied', () => {
      expect(getSafeAccessGateDestination(undefined)).toBe('/auth/login');

      expect(getSafeAccessGateDestination(null)).toBe('/auth/login');

      expect(getSafeAccessGateDestination('')).toBe('/auth/login');
    });

    it('should reject external and protocol-relative destinations', () => {
      expect(getSafeAccessGateDestination('https://example.com')).toBe(
        '/auth/login',
      );

      expect(getSafeAccessGateDestination('//example.com')).toBe('/auth/login');
    });

    it('should reject destinations that would loop back to the gate or target APIs', () => {
      expect(getSafeAccessGateDestination('/')).toBe('/auth/login');

      expect(getSafeAccessGateDestination('/api')).toBe('/auth/login');

      expect(getSafeAccessGateDestination('/api/consultations')).toBe(
        '/auth/login',
      );
    });
  });
});
