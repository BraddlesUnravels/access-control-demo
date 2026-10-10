import { Suspense } from 'react';
import { CodeSquareIcon } from 'lucide-react';
import { AccessGateForm } from '@/components/ui/forms/access-gate-form';
import { getSafeAccessGateDestination } from '@/lib/access-gate/paths';
import type { AccessPageSearchParams } from '@/app/page';
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
    icon={
      <CodeSquareIcon className="size-5 text-cyan-200" aria-hidden="true" />
    }
    badge="Gate 01"
    eyebrow="Demo access"
    title="Explore the live demo"
    description={
      <>
        Enter your invite code to open the application. Inside, demonstration
        accounts let you explore how access changes between users.
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
