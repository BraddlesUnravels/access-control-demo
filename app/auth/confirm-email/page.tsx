import { AutoConfirmEmail } from '@/app/auth/confirm-email/auto-confirm-email';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function Page() {
  return (
    <div className="flex w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Confirming your email</CardTitle>

            <CardDescription>
              We&apos;re finishing your account setup.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <AutoConfirmEmail />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
