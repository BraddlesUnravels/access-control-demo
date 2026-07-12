import { StudentConsultationsView } from '@/components/consultations/student-consultations-view';
import { requireAuthContext } from '@/lib/server/auth';
import { Suspense } from 'react';

const ProtectedContent = async () => {
  const { role } = await requireAuthContext();
  const isAdmin = role === 'admin';

  return <StudentConsultationsView isAdmin={isAdmin} />;
};
const ProtectedPage = () => {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading dashboard...</p>}>
      <ProtectedContent />
    </Suspense>
  );
};

export default ProtectedPage;
