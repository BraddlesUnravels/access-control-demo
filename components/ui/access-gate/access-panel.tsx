import { Suspense } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { AccessGateForm } from '@/components/ui/forms/access-gate-form';
import { getSafeAccessGateDestination } from '@/lib/access-gate/paths';
import type { AccessPageSearchParams } from '@/app/page';
import { Typography } from '@/components/ui/typography';
import { AuthGateLayout } from '@/components/ui/auth-gate';

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
  <AuthGateLayout
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
      <div className="flex gap-3">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.035]">
          <ShieldCheck className="size-5 text-zinc-500" aria-hidden="true" />
        </div>

        <Typography
          as="p"
          variant="body-small"
          className="leading-5 text-zinc-600"
        >
          Invite codes are verified server-side using an HMAC digest. Plaintext
          codes are never stored in PostgreSQL.
        </Typography>
      </div>
    }
    caption="Access gate · authentication · authorization · RLS"
  >
    <Suspense fallback={<AccessGateForm />}>
      <AccessPageContent searchParams={searchParams} />
    </Suspense>
  </AuthGateLayout>
);
