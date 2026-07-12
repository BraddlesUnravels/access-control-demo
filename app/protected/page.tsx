import { StudentConsultationsView } from '@/components/consultations/student-consultations-view';
import { requireAuthContext } from '@/lib/server/auth';

const ProtectedPage = async () => {
  const { role } = await requireAuthContext();
  const isAdmin = role === 'admin';

  return <StudentConsultationsView isAdmin={isAdmin} />;
};

export default ProtectedPage;
