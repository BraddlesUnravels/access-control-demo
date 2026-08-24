import { AdminConsultationsView } from '@/components/admin/admin-consultations-view';
import { StudentConsultationsView } from '@/components/student/student-consultations-view';
import { requireAuthContext } from '@/lib/server/auth';

// This tells Next.js that this page should be rendered on the server, not the client.
export const instant = false;

const ProtectedContent = async () => {
  const { role } = await requireAuthContext();
  const isAdmin = role === 'admin';

  return isAdmin ? <AdminConsultationsView /> : <StudentConsultationsView />;
};

const ProtectedPage = () => {
  return <ProtectedContent />;
};

export default ProtectedPage;
