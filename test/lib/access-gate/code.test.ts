import { describe, expect, it } from 'vitest';

import {
  formatInviteCode,
  ACCESS_INVITE_CODE_LENGTH,
  ACCESS_INVITE_CODE_RAW_LENGTH,
} from '@/lib/access-gate/code';

describe('lib/access-gate/code', () => {
  describe('formatInviteCodeInput', () => {
    it('should format a complete invite code', () => {
      expect(formatInviteCode('ACD4GZ3PDQJFWT9')).toBe('ACD-4GZ3-PDQJ-FWT9');
    });

    it('should uppercase lowercase input', () => {
      expect(formatInviteCode('acd4gz3pdqjfwt9')).toBe('ACD-4GZ3-PDQJ-FWT9');
    });

    it('should normalize pasted separators and whitespace', () => {
      expect(formatInviteCode('acd 4gz3-pdqj fwt9')).toBe('ACD-4GZ3-PDQJ-FWT9');
    });

    it('should format progressively while typing', () => {
      expect(formatInviteCode('A')).toBe('A');
      expect(formatInviteCode('ACD')).toBe('ACD');
      expect(formatInviteCode('ACD4')).toBe('ACD-4');
      expect(formatInviteCode('ACD4GZ3P')).toBe('ACD-4GZ3-P');
    });

    it('should truncate excess characters from a formatted invite code', () => {
      expect(formatInviteCode('ACD-4GZ3-PDQJ-FWT9-EXTRA')).toBe(
        'ACD-4GZ3-PDQJ-FWT9',
      );
    });

    it('should preserve an already formatted invite code', () => {
      expect(formatInviteCode('ACD-4GZ3-PDQJ-FWT9')).toBe('ACD-4GZ3-PDQJ-FWT9');
    });
  });

  it('should expose the formatted maximum length', () => {
    expect(ACCESS_INVITE_CODE_RAW_LENGTH).toBe(18);
    expect(ACCESS_INVITE_CODE_LENGTH).toBe(15);
  });
});
