import { redirect } from 'next/navigation';
import { AdminConsultationsView } from '@/components/consultations/admin-consultations-view';
import { requireAuthContext } from '@/lib/server/auth';
import { Suspense } from 'react';

const AdminContent = async () => {
  const { role } = await requireAuthContext();

  if (role !== 'admin') redirect('/protected');

  return <AdminConsultationsView />;
};
const AdminPage = () => {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading admin view...</p>}>
      <AdminContent />
    </Suspense>
  );
};

export default AdminPage;
