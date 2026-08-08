'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ACCESS_GATE_REQUEST_TOKENS_URL } from '@/lib/access-gate/constants';
import { getSafeAccessGateDestination } from '@/lib/access-gate/paths';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type AccessGateFormProps = {
  initialCode?: string;
  nextPath?: string;
  className?: string;
};

type AccessUnlockErrorBody = {
  error?: unknown;
};

const readAccessUnlockError = async (
  response: Response,
): Promise<AccessUnlockErrorBody> => {
  try {
    return (await response.json()) as AccessUnlockErrorBody;
  } catch {
    return {};
  }
};

export function AccessGateForm({
  initialCode = '',
  nextPath = '/auth/login',
  className,
}: AccessGateFormProps) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState<string | undefined>(undefined);
  const [showRequestHelp, setShowRequestHelp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(undefined);
    setShowRequestHelp(false);

    try {
      const response = await fetch('/api/access/unlock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        const body = await readAccessUnlockError(response);

        setError(
          typeof body.error === 'string'
            ? body.error
            : 'Unable to verify invite code',
        );
        setShowRequestHelp(true);
        return;
      }

      router.replace(getSafeAccessGateDestination(nextPath));
    } catch {
      setError('Unable to verify invite code');
      setShowRequestHelp(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Enter invite code</CardTitle>
          <CardDescription>
            Use the access code from the Bradley Laskey&apos;s resume. Or click
            the link on to open this demo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="code">Invite code</Label>
                <Input
                  id="code"
                  name="code"
                  autoComplete="one-time-code"
                  required
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="ACD-XXXX-XXXX-XXXX"
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              {showRequestHelp && (
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>
                    Need a new code? Contact{' '}
                    <a
                      className="underline underline-offset-4"
                      href={ACCESS_GATE_REQUEST_TOKENS_URL}
                    >
                      Request more tokens
                    </a>
                  </p>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Checking code...' : 'Continue'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
