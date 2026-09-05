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
import { redeemValidInviteOrThrow } from './redeem-invite-or-throw';
import { accessUnlockInputSchema } from '@/lib/validation/schemas';
import { validateWithSchema } from '@/lib/validation/validate';
import { withApiHandler } from '@/lib/with-api-handler';
import { isUuid } from '@/lib/validation/helpers';

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

  const result = await redeemValidInviteOrThrow(codeHash);

  if (result.reason !== 'ok') {
    if (isRedeemAccessInviteReason(result.reason))
      return invalidReasonResponse(result.reason);

    throw new AppError('Access invite redeem returned an invalid result', {
      status: 500,
      safeMessage: 'Unable to verify invite code',
    });
  }

  const expiresAtMs = getAccessExpiryMs(result.access_expires_at);

  if (
    !expiresAtMs ||
    !isUuid(result.invite_id) ||
    !isUuid(result.visit_id) ||
    typeof result.label !== 'string' ||
    result.label.length === 0
  ) {
    throw new AppError('Access invite redeem returned an incomplete result', {
      status: 500,
      safeMessage: 'Unable to verify invite code',
    });
  }

  const cookieValue = createAccessGateCookieValue(
    {
      inviteId: result.invite_id,
      visitId: result.visit_id,
    },
    getAccessGateCookieSecret(),
    expiresAtMs,
  );

  const cookieOptions = getAccessGateCookieOptions(expiresAtMs);

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
