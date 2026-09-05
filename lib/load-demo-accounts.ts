import { safeParse } from 'valibot';
import { demoAccountResponseSchema } from '@/lib/validation/schemas';
import type { DemoAccountWithPassword } from '@/lib/demo-accounts';

export const loadDemoAccounts = async (
  controller: AbortController,
): Promise<{ accounts: DemoAccountWithPassword[]; error?: string }> => {
  try {
    const response = await fetch('/api/demo-accounts', {
      cache: 'no-store',
      credentials: 'same-origin',
      signal: controller.signal,
    });

    if (!response.ok)
      return {
        accounts: [],
        error:
          response.status === 401
            ? 'Your portfolio access has expired.'
            : 'Unable to load demo accounts.',
      };

    const json: unknown = await response.json();
    const result = safeParse(demoAccountResponseSchema, json);

    if (!result.success)
      return { accounts: [], error: 'Unable to load demo accounts.' };

    if (controller.signal.aborted) return { accounts: [] };

    return { accounts: result.output.accounts };
  } catch {
    if (controller.signal.aborted) return { accounts: [] };
    return { accounts: [], error: 'Unable to load demo accounts.' };
  }
};
