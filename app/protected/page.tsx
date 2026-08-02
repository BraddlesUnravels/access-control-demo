import { AdminConsultationsView } from '@/components/admin/admin-consultations-view';
import { StudentConsultationsView } from '@/components/student/student-consultations-view';
import { requireAuthContext } from '@/lib/server/auth';
import { Suspense } from 'react';

const ProtectedContent = async () => {
  const { role } = await requireAuthContext();
  const isAdmin = role === 'admin';

  return isAdmin ? <AdminConsultationsView /> : <StudentConsultationsView />;
};

const ProtectedPage = () => {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
      }
    >
      <ProtectedContent />
    </Suspense>
  );
};

export default ProtectedPage;
