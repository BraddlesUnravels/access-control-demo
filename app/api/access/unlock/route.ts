import { NextResponse } from 'next/server';
import {
  ACCESS_GATE_CONTACT_EMAIL,
  ACCESS_GATE_REQUEST_TOKENS_URL,
} from '@/lib/access-gate/constants';
import {
  createAccessGateCookieValue,
  getAccessGateCookieOptions,
} from '@/lib/access-gate/cookie';
import {
  getAccessGateCodeSecret,
  getAccessGateCookieSecret,
} from '@/lib/access-gate/env';
import { hashInviteCode } from '@/lib/access-gate/hash';
import { AppError } from '@/lib/errors';
import { serverRequestClient } from '@/lib/supabase/server';
import { accessUnlockInputSchema } from '@/lib/validation/schemas';
import { validateWithSchema } from '@/lib/validation/validate';
import { withApiHandler } from '@/lib/with-api-handler';
import { isAzureEnv } from '@/lib/utils';

type RedeemAccessInviteReason = 'ok' | 'invalid' | 'expired' | 'revoked';

type RedeemAccessInviteRow = {
  invite_id: string | null;
  visit_id: string | null;
  label: string | null;
  access_expires_at: string | null;
  reason: RedeemAccessInviteReason | null;
};

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store',
};

const gateHelpPayload = {
  contactEmail: ACCESS_GATE_CONTACT_EMAIL,
  requestTokensUrl: ACCESS_GATE_REQUEST_TOKENS_URL,
};

const getAccessExpiryMs = (expiresAt: string | null): number | undefined => {
  if (!expiresAt) return;

  const expiresAtDateMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiresAtDateMs) || expiresAtDateMs <= Date.now())
    return;

  return expiresAtDateMs;
};

export const POST = withApiHandler(async (request: Request) => {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    throw new AppError('Request body must be valid JSON', {
      status: 400,
      safeMessage: 'Request body must be valid JSON',
    });
  }

  const validation = validateWithSchema(accessUnlockInputSchema, payload);

  if (!validation.success)
    return NextResponse.json(
      {
        error:
          validation.errors[0] ??
          Object.values(validation.fieldErrors)[0]?.[0] ??
          'Access unlock input is invalid',
        errors: validation.errors,
        fieldErrors: validation.fieldErrors,
        ...gateHelpPayload,
      },
      {
        status: 400,
        headers: NO_STORE_HEADERS,
      },
    );

  const codeHash = hashInviteCode(
    validation.data.code,
    getAccessGateCodeSecret(),
  );

  const supabase = await serverRequestClient();

  const { data, error } = await supabase.rpc('redeem_access_invite', {
    p_code_hash: codeHash,
  });

  if (error)
    throw new AppError('Failed to redeem access invite', {
      status: 500,
      safeMessage: 'Unable to verify invite code',
      meta: { code: error.code, message: error.message },
    });

  const redeemRows = data as RedeemAccessInviteRow[] | null;
  const redeemResult = redeemRows?.[0];
  const reason = redeemResult?.reason ?? 'invalid';

  if (reason !== 'ok') {
    const status = reason === 'expired' || reason === 'revoked' ? 403 : 401;
    const message =
      reason === 'expired'
        ? 'This invite code has expired.'
        : reason === 'revoked'
          ? 'This invite code is no longer valid.'
          : 'Invite code is invalid.';

    return NextResponse.json(
      {
        error: message,
        reason,
        ...gateHelpPayload,
      },
      {
        status,
        headers: NO_STORE_HEADERS,
      },
    );
  }

  const expiresAtMs = getAccessExpiryMs(
    redeemResult?.access_expires_at ?? null,
  );

  if (
    !redeemResult?.invite_id ||
    !redeemResult.visit_id ||
    !redeemResult.label ||
    !expiresAtMs
  ) {
    throw new AppError('Access invite redeem returned an incomplete result', {
      status: 500,
      safeMessage: 'Unable to verify invite code',
    });
  }

  const cookieValue = createAccessGateCookieValue(
    {
      inviteId: redeemResult.invite_id,
    },
    getAccessGateCookieSecret(),
    expiresAtMs,
  );

  const cookieOptions = getAccessGateCookieOptions(isAzureEnv(), expiresAtMs);
  const response = NextResponse.json(
    {
      data: {
        label: redeemResult.label,
        expiresAt: redeemResult.access_expires_at,
      },
    },
    {
      status: 200,
      headers: NO_STORE_HEADERS,
    },
  );
  response.cookies.set({
    name: cookieOptions.name,
    value: cookieValue,
    httpOnly: cookieOptions.httpOnly,
    sameSite: cookieOptions.sameSite,
    secure: cookieOptions.secure,
    path: cookieOptions.path,
    expires: cookieOptions.expires,
  });

  return response;
});
