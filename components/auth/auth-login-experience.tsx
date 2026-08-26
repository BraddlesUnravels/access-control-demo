'use client';

import { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import {
  type DemoAccountWithPassword,
  type DemoAccountId,
} from '@/lib/demo-accounts';
import { safeParse } from 'valibot';
import { AuthPanel } from '@/components/ui/auth-panel';
import { AuthPanelNote } from '@/components/ui/auth-panel-note';
import { LoginForm } from '@/components/ui/forms/login-form';
import { DemoAccountsPanel } from './demo-account-panel';
import { demoAccountResponseSchema } from '@/lib/validation/schemas';
import { FormMessage } from '../ui/form-message';

export const LoginExperience = () => {
  const [accounts, setAccounts] = useState<
    DemoAccountWithPassword[] | undefined
  >();
  const [accountsError, setAccountsError] = useState<string | undefined>();
  const [selectedAccountId, setSelectedAccountId] = useState<
    DemoAccountId | undefined
  >();

  useEffect(() => {
    const controller = new AbortController();

    const loadDemoAccounts = async () => {
      setAccounts(undefined);
      try {
        const response = await fetch('/api/demo-accounts', {
          cache: 'no-store',
          credentials: 'same-origin',
          signal: controller.signal,
        });

        if (!response.ok)
          return setAccountsError(
            response.status === 401
              ? 'Your portfolio access has expired.'
              : 'Unable to load demo accounts.',
          );

        const json: unknown = await response.json();
        const result = safeParse(demoAccountResponseSchema, json);

        if (!result.success)
          return setAccountsError('The demo accounts response was invalid.');

        if (controller.signal.aborted) return;

        setAccounts(result.output.accounts);
        setAccountsError(undefined);
      } catch {
        // fetch() and response.json() can still reject.
        if (controller.signal.aborted) return;

        setAccountsError('Unable to load demo accounts.');
      }
    };

    void loadDemoAccounts();

    return () => {
      controller.abort();
    };
  }, []);

  const selectedAccount =
    accounts?.find((account) => account.id === selectedAccountId) ?? undefined;

  const handleAccountSelect = (account: DemoAccountWithPassword) => {
    setSelectedAccountId(account.id);
  };

  return (
    <div
      id="login-exp"
      className="grid grid-cols-1 w-full h-auto gap-6 lg:grid-cols-2 xl:grid-cols-[700px_minmax(0,1fr)] lg:items-center"
    >
      <DemoAccountsPanel
        accounts={accounts ?? []}
        selectedAccountId={selectedAccountId}
        onAccountSelect={handleAccountSelect}
        className="order-2 lg:order-2 lg:mx-0 lg:self-center"
      />

      <AuthPanel
        icon={<Lock className="size-5 text-cyan-200" aria-hidden="true" />}
        badge="Gate 02"
        eyebrow="Application authentication"
        title="Sign in to the LMS"
        description="Choose a demonstration account to explore its role-specific workspace."
        footer={
          <AuthPanelNote>
            Authentication confirms user identity; roles and database policies
            control what users can access.
          </AuthPanelNote>
        }
        caption="Invite gate · authentication · authorization · RLS"
        className="order-1 lg:order-1 lg:self-center"
      >
        <LoginForm
          key={selectedAccount?.id ?? 'manual-login'}
          initialEmail={selectedAccount?.email}
          initialPassword={selectedAccount?.password}
        />
      </AuthPanel>

      {accountsError && (
        <FormMessage variant="error" className="col-span-full">
          {accountsError}
        </FormMessage>
      )}
    </div>
  );
};
