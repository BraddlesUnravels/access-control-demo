import { NextResponse } from 'next/server';
import {
  ACCESS_GATE_CONTACT_EMAIL,
  ACCESS_GATE_REQUEST_TOKENS_URL,
} from '@/lib/access-gate/constants';
import {
  createAccessGateCookieValue,
  getAccessGateCookieOptions,
} from '@/lib/access-gate/cookie';
import { getAccessGateSecret } from '@/lib/access-gate/env';
import { hashInviteCode } from '@/lib/access-gate/hash';
import { AppError } from '@/lib/errors';
import { serverRequestClient } from '@/lib/supabase/server';
import { accessUnlockInputSchema } from '@/lib/validation/schemas';
import { validateWithSchema } from '@/lib/validation/validate';
import { withApiHandler } from '@/lib/with-api-handler';

type RedeemAccessInviteRow = {
  invite_id: string | null;
  visit_id: string | null;
  label: string | null;
  reason: string | null;
};

const gateHelpPayload = {
  contactEmail: ACCESS_GATE_CONTACT_EMAIL,
  requestTokensUrl: ACCESS_GATE_REQUEST_TOKENS_URL,
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

  if (!validation.success) {
    const firstFieldError = Object.values(validation.fieldErrors)[0]?.[0];

    return NextResponse.json(
      {
        error:
          validation.errors[0] ??
          firstFieldError ??
          'Access unlock input is invalid',
        errors: validation.errors,
        fieldErrors: validation.fieldErrors,
        ...gateHelpPayload,
      },
      { status: 400 },
    );
  }

  const secret = getAccessGateSecret();
  const codeHash = hashInviteCode(validation.data.code, secret);
  const supabase = await serverRequestClient();
  const userAgent = request.headers.get('user-agent') ?? undefined;

  const { data, error } = await supabase.rpc('redeem_access_invite', {
    p_code_hash: codeHash,
    p_user_agent: userAgent,
  });

  if (error) {
    throw new AppError('Failed to redeem access invite', {
      status: 500,
      safeMessage: 'Unable to verify invite code',
      meta: { code: error.code, message: error.message },
    });
  }

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
      { status },
    );
  }

  if (
    !redeemResult?.invite_id ||
    !redeemResult.visit_id ||
    !redeemResult.label
  ) {
    throw new AppError('Access invite redeem returned an incomplete result', {
      status: 500,
      safeMessage: 'Unable to verify invite code',
    });
  }

  const cookieValue = createAccessGateCookieValue(
    {
      visitId: redeemResult.visit_id,
      inviteId: redeemResult.invite_id,
      label: redeemResult.label,
    },
    secret,
  );
  const isSecure = new URL(request.url).protocol === 'https:';
  const cookieOptions = getAccessGateCookieOptions(isSecure);
  const response = NextResponse.json(
    {
      data: {
        label: redeemResult.label,
      },
    },
    { status: 200 },
  );

  response.cookies.set({
    name: cookieOptions.name,
    value: cookieValue,
    httpOnly: cookieOptions.httpOnly,
    sameSite: cookieOptions.sameSite,
    secure: cookieOptions.secure,
    path: cookieOptions.path,
    maxAge: cookieOptions.maxAge,
  });

  return response;
});
