import { redirect } from 'next/navigation';
import { AdminConsultationsView } from '@/components/consultations/admin-consultations-view';
import { requireAuthContext } from '@/lib/server/auth';

const AdminPage = async () => {
  const { role } = await requireAuthContext();

  if (role !== 'admin') redirect('/protected');

  return <AdminConsultationsView />;
};

export default AdminPage;
