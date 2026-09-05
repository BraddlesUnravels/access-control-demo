import 'server-only';

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

export const validateAccessGateSession = async (
  inviteId: string,
  visitId: string,
): Promise<boolean> => {
  const supabaseUrl = process.env.NEXT_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) return false;

  try {
    const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });

    const { data, error } = await supabase.rpc('validate_access_gate_session', {
      p_invite_id: inviteId,
      p_visit_id: visitId,
    });

    if (error || typeof data !== 'boolean') return false;

    return data;
  } catch {
    return false;
  }
};
