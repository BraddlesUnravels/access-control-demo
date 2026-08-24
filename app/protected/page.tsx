import { AdminConsultationsView } from '@/components/admin/admin-consultations-view';
import { StudentConsultationsView } from '@/components/student/student-consultations-view';
import { requireAuthContext } from '@/lib/server/auth';

// Allow auth-dependent runtime data to block this route rather than prerender.
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
