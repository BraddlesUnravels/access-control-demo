'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

const AUTO_CONFIRM_DELAY_MS = 750;
const FALLBACK_DELAY_MS = 4000;
const DEFAULT_DESTINATION = '/protected';

type Confirmation = {
  tokenHash: string;
  next: string;
};

const readConfirmationFragment = () => {
  const fragment = new URLSearchParams(window.location.hash.slice(1));

  const tokenHash = fragment.get('token_hash');

  const type = fragment.get('type');

  if (!tokenHash || type !== 'email') return;

  const next =
    new URLSearchParams(window.location.search).get('next') ??
    DEFAULT_DESTINATION;

  return {
    tokenHash,
    next,
  };
};

const clearConfirmationUrl = () => {
  window.history.replaceState({}, '', window.location.pathname);
};

export const AutoConfirmEmail = () => {
  const formRef = useRef<HTMLFormElement>(null);
  const tokenHashRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLInputElement>(null);

  const confirmationRef = useRef<Confirmation | null | undefined>(undefined);

  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    /*
     * Capture the browser-only fragment once.
     *
     * The ref survives React Strict Mode's development
     * effect setup/cleanup cycle.
     */
    if (confirmationRef.current === undefined) {
      confirmationRef.current = readConfirmationFragment() ?? null;

      if (confirmationRef.current) {
        clearConfirmationUrl();
      }
    }

    const confirmation = confirmationRef.current;

    if (!confirmation) {
      window.location.replace('/auth/login');
      return;
    }

    const form = formRef.current;
    const tokenHashInput = tokenHashRef.current;
    const nextInput = nextRef.current;

    if (!form || !tokenHashInput || !nextInput) {
      window.location.replace('/auth/login');
      return;
    }

    tokenHashInput.value = confirmation.tokenHash;

    nextInput.value = confirmation.next;

    const submitTimer = window.setTimeout(() => {
      form.requestSubmit();
    }, AUTO_CONFIRM_DELAY_MS);

    const fallbackTimer = window.setTimeout(() => {
      setShowFallback(true);
    }, FALLBACK_DELAY_MS);

    return () => {
      window.clearTimeout(submitTimer);
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Confirming your email address...
      </p>

      <form ref={formRef} action="/auth/confirm" method="post">
        <input
          ref={tokenHashRef}
          type="hidden"
          name="token_hash"
          defaultValue=""
        />

        <input type="hidden" name="type" value="email" readOnly />

        <input ref={nextRef} type="hidden" name="next" defaultValue="" />

        {/*
         * Honeypot.
         * Keep this as a normal text input rather than
         * type="hidden". Legitimate users never interact
         * with it, while automated form fillers may.
         */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-[10000px] top-auto h-px w-px overflow-hidden"
        >
          <label htmlFor="website">Website</label>

          <input
            id="website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        {showFallback && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Taking longer than expected?
            </p>

            <Button type="submit" className="w-full">
              Continue
            </Button>
          </div>
        )}
      </form>
    </div>
  );
};
