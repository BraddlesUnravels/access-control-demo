import { Suspense } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { AccessGateForm } from '@/components/ui/forms/access-gate-form';
import { getSafeAccessGateDestination } from '@/lib/access-gate/paths';
import type { AccessPageSearchParams } from '@/app/page';
import { Typography } from '@/components/ui/typography';
import { AuthPanel } from '@/components/ui/auth-panel';
import { AuthPanelNote } from '@/components/ui/auth-panel-note';

type Props = {
  searchParams: AccessPageSearchParams;
};

const AccessPageContent = async ({
  searchParams,
}: {
  searchParams: AccessPageSearchParams;
}) => {
  const params = await searchParams;
  const nextPath = getSafeAccessGateDestination(params.next);

  return <AccessGateForm initialCode={params.code ?? ''} nextPath={nextPath} />;
};

export const AccessGate = ({ searchParams }: Props) => (
  <AuthPanel
    icon={<KeyRound className="size-5 text-cyan-200" aria-hidden="true" />}
    badge="Gate 01"
    eyebrow="Private demo access"
    title="Enter the application"
    description={
      <>
        Use the invite code supplied with the portfolio link. This gate only
        opens the hosted demo; authentication and application roles remain
        separate.
      </>
    }
    footer={
      <AuthPanelNote>
        Invite codes are verified server-side using a secure cryptographic check
        without storing the original codes.
      </AuthPanelNote>
    }
    caption="Access gate · authentication · authorization · RLS"
  >
    <Suspense fallback={<AccessGateForm />}>
      <AccessPageContent searchParams={searchParams} />
    </Suspense>
  </AuthPanel>
);
