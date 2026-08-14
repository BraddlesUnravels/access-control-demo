'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
import {
  DEMO_ACCOUNTS,
  type DemoAccount,
  type DemoAccountId,
} from '@/lib/demo-accounts';
import { AuthPanel } from '@/components/ui/auth-panel';
import { AuthPanelNote } from '@/components/ui/auth-panel-note';
import { LoginForm } from '@/components/ui/forms/login-form';
import { DemoAccountsPanel } from './demo-account-panel';

export const LoginExperience = () => {
  const [selectedAccountId, setSelectedAccountId] =
    useState<DemoAccountId | null>(null);

  const selectedAccount =
    DEMO_ACCOUNTS.find((account) => account.id === selectedAccountId) ?? null;

  const handleAccountSelect = (account: DemoAccount) => {
    setSelectedAccountId(account.id);
  };

  return (
    <div
      id="login-exp"
      className="grid grid-cols-1 w-full h-auto gap-6 lg:grid-cols-2 xl:grid-cols-[700px_minmax(0,1fr)] lg:items-center"
    >
      <DemoAccountsPanel
        accounts={DEMO_ACCOUNTS}
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
    </div>
  );
};
