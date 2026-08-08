import { describe, expect, it } from 'vitest';
import { hashInviteCode, normalizeInviteCode } from '@/lib/access-gate/hash';

const LOCAL_CODE_SECRET =
  'local-access-gate-secret-that-meets-length-requirements';

describe('lib/access-gate/hash', () => {
  describe('normalizeInviteCode', () => {
    it('should trim outer whitespace, uppercase, and remove internal whitespace', () => {
      expect(normalizeInviteCode('  acd-4gz3 pdqj-fwt9  ')).toBe(
        'ACD-4GZ3PDQJ-FWT9',
      );
    });

    it('should preserve invite-code separators', () => {
      expect(normalizeInviteCode('ACD-4GZ3-PDQJ-FWT9')).toBe(
        'ACD-4GZ3-PDQJ-FWT9',
      );

      expect(normalizeInviteCode('ACD4GZ3PDQJFWT9')).not.toBe(
        normalizeInviteCode('ACD-4GZ3-PDQJ-FWT9'),
      );
    });
  });

  describe('hashInviteCode', () => {
    it('should produce the expected HMAC-SHA256 digest for a known local test code', () => {
      expect(hashInviteCode('ACD-DEV1-TEST', LOCAL_CODE_SECRET)).toBe(
        '7ddb0b8ed9c019afa6210be5f501e38e85db6e031e026b3c8a7a6b6fdca7bafa',
      );
    });

    it('should hash equivalent normalized codes identically', () => {
      expect(hashInviteCode('  acd-dev1-test  ', LOCAL_CODE_SECRET)).toBe(
        hashInviteCode('ACD-DEV1-TEST', LOCAL_CODE_SECRET),
      );
    });

    it('should produce different digests for different codes or secrets', () => {
      expect(hashInviteCode('ACD-DEV1-TEST', LOCAL_CODE_SECRET)).not.toBe(
        hashInviteCode('ACD-DEV2-TEST', LOCAL_CODE_SECRET),
      );

      expect(hashInviteCode('ACD-DEV1-TEST', LOCAL_CODE_SECRET)).not.toBe(
        hashInviteCode(
          'ACD-DEV1-TEST',
          'different-access-gate-secret-that-is-long-enough',
        ),
      );
    });
  });
});
