import { isUuid, isRecord } from '../validation/helpers';
import { AppError } from '../errors';
import { serverRequestClient } from '../supabase/server';

export type AccessInviteDenialReason = 'invalid' | 'expired' | 'revoked';

export type AccessInviteRedemption =
  | {
      granted: true;
      inviteId: string;
      visitId: string;
      label: string;
      expiresAt: string;
      expiresAtMs: number;
    }
  | {
      granted: false;
      reason: AccessInviteDenialReason;
    };

const isRedeemReason = (
  value: unknown,
): value is 'ok' | AccessInviteDenialReason =>
  value === 'ok' ||
  value === 'invalid' ||
  value === 'expired' ||
  value === 'revoked';

const invalidRpcResultError = (
  message: string,
  meta?: Record<string, unknown>,
) =>
  new AppError(message, {
    status: 500,
    safeMessage: 'Unable to verify invite code',
    meta,
  });

export const redeemAccessInvite = async (
  codeHash: string,
): Promise<AccessInviteRedemption> => {
  const supabase = await serverRequestClient();

  const { data, error } = await supabase.rpc('redeem_access_invite', {
    p_code_hash: codeHash,
  });

  if (error) {
    throw invalidRpcResultError('Failed to redeem access invite', {
      code: error.code,
      message: error.message,
    });
  }

  if (!Array.isArray(data) || data.length !== 1) {
    throw invalidRpcResultError(
      'Access invite redeem returned an invalid result count',
      {
        resultCount: Array.isArray(data) ? data.length : undefined,
      },
    );
  }

  const [result] = data as unknown[];

  if (!isRecord(result) || !isRedeemReason(result.reason)) {
    throw invalidRpcResultError(
      'Access invite redeem returned an invalid result',
    );
  }

  if (result.reason !== 'ok') {
    return {
      granted: false,
      reason: result.reason,
    };
  }

  const expiresAt =
    typeof result.access_expires_at === 'string'
      ? result.access_expires_at
      : undefined;

  const expiresAtMs = expiresAt ? Date.parse(expiresAt) : Number.NaN;

  if (
    !isUuid(result.invite_id) ||
    !isUuid(result.visit_id) ||
    typeof result.label !== 'string' ||
    result.label.length === 0 ||
    !expiresAt ||
    !Number.isFinite(expiresAtMs) ||
    expiresAtMs <= Date.now()
  ) {
    throw invalidRpcResultError(
      'Access invite redeem returned an incomplete result',
    );
  }

  return {
    granted: true,
    inviteId: result.invite_id,
    visitId: result.visit_id,
    label: result.label,
    expiresAt,
    expiresAtMs,
  };
};
