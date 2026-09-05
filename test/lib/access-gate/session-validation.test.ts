import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { validateAccessGateSession } from '@/lib/access-gate/session-validation';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

const setup = () => {
  const rpc = vi.fn();

  vi.mocked(createClient).mockReturnValue({ rpc } as never);

  return { rpc };
};

describe('lib/access-gate/session-validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_SUPABASE_URL', 'http://localhost:54321');
    vi.stubEnv('NEXT_SUPABASE_PUBLISHABLE_KEY', 'test-key');
  });

  it('returns the validated boolean result from the RPC', async () => {
    const { rpc } = setup();
    rpc.mockResolvedValue({ data: true, error: null });

    await expect(
      validateAccessGateSession('invite-1', 'visit-1'),
    ).resolves.toBe(true);

    expect(rpc).toHaveBeenCalledWith('validate_access_gate_session', {
      p_invite_id: 'invite-1',
      p_visit_id: 'visit-1',
    });
  });

  it('returns false when the RPC rejects the session', async () => {
    const { rpc } = setup();
    rpc.mockResolvedValue({ data: false, error: null });

    await expect(
      validateAccessGateSession('invite-1', 'visit-1'),
    ).resolves.toBe(false);
  });

  it('fails closed on RPC errors and unexpected results', async () => {
    const { rpc } = setup();
    rpc.mockResolvedValueOnce({ data: null, error: new Error('RPC failed') });

    await expect(
      validateAccessGateSession('invite-1', 'visit-1'),
    ).resolves.toBe(false);

    rpc.mockResolvedValueOnce({ data: 'true', error: null });

    await expect(
      validateAccessGateSession('invite-1', 'visit-1'),
    ).resolves.toBe(false);
  });

  it('fails closed when Supabase configuration is missing', async () => {
    vi.stubEnv('NEXT_SUPABASE_URL', '');

    await expect(
      validateAccessGateSession('invite-1', 'visit-1'),
    ).resolves.toBe(false);

    expect(createClient).not.toHaveBeenCalled();
  });
});
