export type RedeemAccessInviteReason = 'ok' | 'invalid' | 'expired' | 'revoked';

export type RedeemAccessInviteRow = {
  invite_id: string | null;
  visit_id: string | null;
  label: string | null;
  access_expires_at: string | null;
  reason: RedeemAccessInviteReason | null;
};
