'use client';

import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ACCESS_GATE_REQUEST_TOKENS_URL } from '@/lib/access-gate/constants';
import { getSafeAccessGateDestination } from '@/lib/access-gate/paths';
import { getApiErrorMessage, readJsonResponse } from '@/lib/api-response';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { FormMessage } from '@/components/ui/form-message';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { formatInviteCode } from '@/lib/access-gate/code';
import { Typography } from '@/components/ui/typography';
import { cn } from '@/lib/utils';

type AccessGateFormProps = {
  initialCode?: string;
  nextPath?: string;
  className?: string;
};

export function AccessGateForm({
  initialCode,
  nextPath = '/auth/login',
  className,
}: AccessGateFormProps) {
  const router = useRouter();
  const [code, setCode] = useState(
    initialCode ? formatInviteCode(initialCode) : '',
  );
  const [error, setError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(undefined);

    try {
      const response = await fetch('/api/access/unlock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const payload = await readJsonResponse(response);

      if (!response.ok) {
        setError(getApiErrorMessage(payload, 'Unable to verify invite code'));
        return;
      }

      router.replace(getSafeAccessGateDestination(nextPath));
    } catch {
      setError('Unable to verify invite code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-5', className)}>
      <FormField
        htmlFor="code"
        label="Invite code"
        labelClassName="font-semibold uppercase tracking-[0.08em] text-zinc-400"
        action={
          <Typography
            as="span"
            variant="caption"
            className="font-mono uppercase tracking-[0.12em] text-zinc-700"
          >
            Required
          </Typography>
        }
      >
        <div className="relative">
          <Input
            id="code"
            name="code"
            autoComplete="one-time-code"
            autoCapitalize="characters"
            maxLength={18}
            spellCheck={false}
            required
            value={code}
            onChange={(event) => setCode(formatInviteCode(event.target.value))}
            placeholder="ACD-XXXX-XXXX-XXXX"
            aria-describedby={error ? 'access-code-error' : undefined}
            aria-invalid={Boolean(error)}
            className={cn(
              'h-13 rounded-xl border-white/10 bg-black/25 px-4 font-mono',
              'text-sm tracking-widest text-zinc-100 shadow-inner',
              'placeholder:text-zinc-700',
              'focus-visible:border-cyan-300/40 focus-visible:ring-2',
              'focus-visible:ring-cyan-300/10',
              error &&
                'border-destructive/50 focus-visible:border-destructive/60 focus-visible:ring-destructive/10',
            )}
          />

          <div className="pointer-events-none absolute inset-x-4 bottom-0 h-px bg-linear-to-r from-transparent via-cyan-300/0 to-transparent transition-all peer-focus:via-cyan-300/40" />
        </div>
      </FormField>

      {error && <FormMessage id="access-code-error">{error}</FormMessage>}

      <FormSubmitButton
        isLoading={isLoading}
        loadingLabel="Verifying access"
        size="lg"
        disabled={isLoading}
        className={cn(
          'group h-10 w-full rounded-xl bg-linear-to-r from-cyan-300 to-cyan-200',
          'font-semibold text-slate-950 shadow-[0_8px_28px_rgba(34,211,238,0.12)]',
          'transition-all duration-200',
          'hover:from-cyan-200 hover:to-cyan-100',
          'hover:shadow-[0_10px_34px_rgba(34,211,238,0.2)]',
          'active:translate-y-px',
        )}
      >
        Unlock demo
        <ArrowRight
          className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </FormSubmitButton>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-white/6" />
        <Typography
          as="span"
          variant="caption"
          className="font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-700"
        >
          Invite only
        </Typography>
        <div className="h-px flex-1 bg-white/6" />
      </div>

      <Typography
        as="p"
        variant="body-small"
        className="text-center leading-5 text-zinc-600"
      >
        Don&apos;t have a valid invite?{' '}
        <Typography
          as="a"
          variant="body-small"
          className="font-medium text-zinc-400 underline decoration-zinc-700 underline-offset-4 transition-colors hover:text-cyan-200 hover:decoration-cyan-300/50"
          href={ACCESS_GATE_REQUEST_TOKENS_URL}
        >
          Request access
        </Typography>
      </Typography>
    </form>
  );
}
