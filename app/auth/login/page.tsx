import { LoginForm } from '@/components/ui/forms/lms-login-form';

export default function Page() {
  return (
    <div className="flex w-full items-center justify-center px-6 py-10 md:px-10">
      <div className="w-full max-w-[460px]">
        <LoginForm />
      </div>
    </div>
  );
}
