import { NextResponse } from 'next/server';
import type { ValidationFailure } from '@/lib/validation/validate';
import type { RedeemAccessInviteReason } from './types';
import {
  ACCESS_GATE_CONTACT_EMAIL,
  ACCESS_GATE_REQUEST_TOKENS_URL,
} from '@/lib/access-gate/constants';

export const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store',
};

export const gateHelpPayload = {
  contactEmail: ACCESS_GATE_CONTACT_EMAIL,
  requestTokensUrl: ACCESS_GATE_REQUEST_TOKENS_URL,
};

export const isRedeemAccessInviteReason = (
  value: unknown,
): value is RedeemAccessInviteReason =>
  value === 'ok' ||
  value === 'invalid' ||
  value === 'expired' ||
  value === 'revoked';

export const getAccessExpiryMs = (
  expiresAt: string | null,
  nowMs: number = Date.now(),
): number | undefined => {
  if (!expiresAt) return;

  const expiresAtMs = Date.parse(expiresAt);

  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= nowMs) return;

  return expiresAtMs;
};

export const rateLimitExceededResponse = (retryAfter: string) =>
  NextResponse.json(
    {
      error: 'Too many requests. Please try again later.',
      ...gateHelpPayload,
    },
    {
      status: 429,
      headers: {
        ...NO_STORE_HEADERS,
        'Retry-After': retryAfter,
      },
    },
  );

export const validationFailureResponse = (fail: ValidationFailure) =>
  NextResponse.json(
    {
      error:
        fail.errors[0] ??
        Object.values(fail.fieldErrors)[0]?.[0] ??
        'Access unlock input is invalid',
      errors: fail.errors,
      fieldErrors: fail.fieldErrors,
      ...gateHelpPayload,
    },
    {
      status: 400,
      headers: NO_STORE_HEADERS,
    },
  );

export const invalidReasonResponse = (reason: string) => {
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
};

type RedeemAccessInviteResult = {
  access_expires_at: string;
  invite_id: string;
  label: string;
  reason: string;
  visit_id: string;
};

export const successResponse = (result: RedeemAccessInviteResult) =>
  NextResponse.json(
    {
      data: {
        label: result.label,
        expiresAt: result.access_expires_at,
      },
    },
    {
      status: 200,
      headers: NO_STORE_HEADERS,
    },
  );
