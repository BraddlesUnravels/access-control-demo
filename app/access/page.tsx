import { Suspense } from 'react';
import { AccessGateForm } from '@/components/access-gate-form';

type AccessPageSearchParams = Promise<{
  code?: string;
  next?: string;
}>;

type AccessPageProps = {
  searchParams: AccessPageSearchParams;
};

const AccessPageContent = async ({
  searchParams,
}: {
  searchParams: AccessPageSearchParams;
}) => {
  const params = await searchParams;
  const nextPath =
    typeof params.next === 'string' && params.next.startsWith('/')
      ? params.next
      : '/auth/login';

  return <AccessGateForm initialCode={params.code ?? ''} nextPath={nextPath} />;
};

export default function AccessPage({ searchParams }: AccessPageProps) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense fallback={<AccessGateForm />}>
          <AccessPageContent searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
