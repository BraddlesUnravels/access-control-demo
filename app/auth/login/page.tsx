import { LoginForm } from '@/components/ui/forms/login-form';
import { AuthPanel } from '@/components/ui/auth-panel';
import { AuthPanelNote } from '@/components/ui/auth-panel-note';
import { Lock } from 'lucide-react';

export default function Page() {
  return (
    <AuthPanel
      icon={<Lock className="size-5 text-cyan-200" aria-hidden="true" />}
      badge="Gate 02"
      eyebrow="Application Authentication"
      title="Sign into the LMS"
      description={
        <>
          Authenticate with one of the demonstration accounts to continue to its
          role-scoped workspace.
        </>
      }
      footer={
        <AuthPanelNote>
          Authentication confirms user identity; roles and database policies
          control what the user can access.
        </AuthPanelNote>
      }
    >
      <LoginForm />
    </AuthPanel>
  );
}
