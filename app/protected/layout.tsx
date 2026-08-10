import { ApplicationShell } from '@/components/ui/application-shell';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ApplicationShell>{children}</ApplicationShell>;
}
