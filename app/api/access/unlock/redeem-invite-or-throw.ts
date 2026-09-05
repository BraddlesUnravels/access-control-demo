import { serverRequestClient } from '@/lib/supabase/server';
import { AppError } from '@/lib/errors';

export const redeemValidInviteOrThrow = async (codeHash: string) => {
  const supabase = await serverRequestClient();
  const { data: dataArray, error } = await supabase.rpc(
    'redeem_access_invite',
    {
      p_code_hash: codeHash,
    },
  );

  const data = dataArray?.[0];

  if (error || !data || dataArray.length !== 1)
    throw new AppError('Failed to redeem access invite', {
      status: 500,
      safeMessage: 'Unable to verify invite code',
      meta: {
        ...(error &&
          error.code && {
            code: error?.code,
            message: error?.message,
          }),

        ...(!error &&
          dataArray?.length !== 1 && {
            resultCount: Array.isArray(data) ? data.length : undefined,
          }),
      },
    });

  return data;
};
