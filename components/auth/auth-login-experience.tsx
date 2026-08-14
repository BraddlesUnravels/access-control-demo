'use client';

import { useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import {
  DEMO_ACCOUNTS,
  type DemoAccount,
  type DemoAccountId,
} from '@/lib/demo-accounts';
import { AuthPanel } from '@/components/ui/auth-panel';
import { AuthPanelNote } from '@/components/ui/auth-panel-note';
import { LoginForm } from '@/components/ui/forms/login-form';
import { DemoAccountsPanel } from './demo-account-panel';

const CornerShieldIcon = () => (
  <div className="pointer-events-none fixed top-3 left-3 z-[100] flex items-center lg:gap-3">
    <div className="relative flex size-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04]">
      <ShieldCheck className="size-[18px] text-cyan-300" aria-hidden="true" />

      <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-[#080b12] bg-emerald-400" />
    </div>

    <div>
      <p className="text-sm font-semibold tracking-wide text-zinc-100">
        Access Control Demo
      </p>

      <p className="mt-0.5 text-xs text-zinc-600">
        Full-stack security portfolio
      </p>
    </div>
  </div>
);

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
        icon={<KeyRound className="size-5 text-cyan-200" aria-hidden="true" />}
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
