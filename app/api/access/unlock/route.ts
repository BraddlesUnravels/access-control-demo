import {
  isRedeemAccessInviteReason,
  getAccessExpiryMs,
  rateLimitExceededResponse,
  validationFailureResponse,
  invalidReasonResponse,
  successResponse,
} from './helpers';
import {
  createAccessGateCookieValue,
  getAccessGateCookieOptions,
} from '@/lib/access-gate/cookie';
import {
  getAccessGateCodeSecret,
  getAccessGateCookieSecret,
} from '@/lib/access-gate/env';
import { hashInviteCode } from '@/lib/access-gate/hash';
import { getClientIdentifier } from '@/lib/rate-limiter/client';
import { consumeRateLimit } from '@/lib/rate-limiter/in-memory';
import { AppError } from '@/lib/errors';
import { serverRequestClient } from '@/lib/supabase/server';
import { accessUnlockInputSchema } from '@/lib/validation/schemas';
import { validateWithSchema } from '@/lib/validation/validate';
import { withApiHandler } from '@/lib/with-api-handler';
import { isAzureEnv } from '@/lib/utils';

export const POST = withApiHandler(async (request: Request) => {
  const rateLimit = consumeRateLimit(getClientIdentifier(request));

  if (!rateLimit.allowed)
    return rateLimitExceededResponse(String(rateLimit.retryAfterSeconds));

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

  if (!validation.success) return validationFailureResponse(validation);

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
      meta: {
        code: error.code,
        message: error.message,
      },
    });

  if (!Array.isArray(data) || data.length !== 1)
    throw new AppError(
      'Access invite redeem returned an invalid result count',
      {
        status: 500,
        safeMessage: 'Unable to verify invite code',
        meta: {
          resultCount: Array.isArray(data) ? data.length : undefined,
        },
      },
    );

  const [result] = data;

  if (!result || !isRedeemAccessInviteReason(result.reason))
    throw new AppError('Access invite redeem returned an invalid result', {
      status: 500,
      safeMessage: 'Unable to verify invite code',
    });

  const { reason } = result;

  if (reason !== 'ok') return invalidReasonResponse(reason);

  const expiresAtMs = getAccessExpiryMs(result.access_expires_at);

  if (!result.invite_id || !result.visit_id || !result.label || !expiresAtMs) {
    throw new AppError('Access invite redeem returned an incomplete result', {
      status: 500,
      safeMessage: 'Unable to verify invite code',
    });
  }

  const cookieValue = createAccessGateCookieValue(
    {
      inviteId: result.invite_id,
    },
    getAccessGateCookieSecret(),
    expiresAtMs,
  );

  const cookieOptions = getAccessGateCookieOptions(isAzureEnv(), expiresAtMs);

  const response = successResponse(result);

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
