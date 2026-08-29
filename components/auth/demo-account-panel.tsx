'use client';

import { Check, KeyRound, LogIn, ShieldCheck, UserRound } from 'lucide-react';
import type { DemoAccountId } from '@/lib/demo-accounts';
import type { DemoAccountWithPassword } from '@/lib/validation/types/demo-account';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import { cn } from '@/lib/utils';

type DemoAccountsPanelProps = {
  accounts: readonly DemoAccountWithPassword[];
  selectedAccountId?: DemoAccountId;
  onAccountSelect: (account: DemoAccountWithPassword) => void;
  className?: string;
};

export const DemoAccountsPanel = ({
  accounts,
  selectedAccountId,
  onAccountSelect,
  className,
}: DemoAccountsPanelProps) => (
  <section
    aria-labelledby="demo-accounts-title"
    className={cn(
      'w-full rounded-4xl border border-white/8',
      'bg-[#0d1119]/80 p-7 shadow-[0_24px_70px_rgba(0,0,0,0.3)]',
      'backdrop-blur-xl lg:p-6',
      className,
    )}
  >
    <div className="flex items-start justify-between gap-4">
      <div>
        <Typography
          as="p"
          variant="caption"
          className="font-mono font-medium uppercase tracking-[0.2em] text-cyan-300"
        >
          Demo access
        </Typography>

        <Typography
          as="h2"
          id="demo-accounts-title"
          variant="section-title"
          className="mt-3 font-semibold tracking-[-0.035em] text-white"
        >
          Explore by role
        </Typography>
      </div>

      <Badge variant="secondary">Start here</Badge>
    </div>

    <Typography
      as="p"
      variant="body"
      className="mt-4 max-w-xl leading-6 text-zinc-500"
    >
      Choose an account to fill the sign-in form. Student accounts can access
      only their own records; the administrator can view records across users.
    </Typography>

    <div className="mt-6 grid gap-3">
      {accounts.map((account) => {
        const isSelected = account.id === selectedAccountId;
        const Icon = account.role === 'admin' ? ShieldCheck : UserRound;

        return (
          <div
            key={account.id}
            className={cn(
              'rounded-2xl border bg-black/15 p-4',
              'transition-[border-color,background-color,box-shadow]',
              isSelected
                ? [
                    'border-cyan-300/25',
                    'bg-cyan-300/3.5',
                    'shadow-[inset_0_0_0_1px_rgba(103,232,249,0.03)]',
                  ]
                : [
                    'border-white/7',
                    'hover:border-white/12',
                    'hover:bg-white/1.5',
                  ],
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-xl border',
                  account.role === 'admin'
                    ? 'border-cyan-300/15 bg-cyan-300/6'
                    : 'border-white/7 bg-white/3.5',
                )}
              >
                <Icon
                  className={cn(
                    'size-4',
                    account.role === 'admin'
                      ? 'text-cyan-200'
                      : 'text-zinc-400',
                  )}
                  aria-hidden="true"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Typography
                    as="h3"
                    variant="component-title"
                    className="font-semibold text-zinc-100"
                  >
                    {account.label}
                  </Typography>

                  <Badge
                    variant={account.role === 'admin' ? 'default' : 'secondary'}
                  >
                    {account.scopeLabel}
                  </Badge>
                </div>

                <code className="mt-1.5 block text-xs text-zinc-500">
                  {account.email}
                </code>

                <div className="flex items-center justify-between gap-3">
                  <Typography
                    as="span"
                    variant="caption"
                    className="font-mono uppercase tracking-[0.12em] text-zinc-700"
                  >
                    Password
                  </Typography>

                  <code className="text-xs text-zinc-400">
                    {account.password}
                  </code>
                </div>
              </div>
            </div>

            <Typography
              as="p"
              variant="body-small"
              className="mt-3 leading-5 text-zinc-500"
            >
              {account.description}
            </Typography>

            <Button
              type="button"
              size="sm"
              variant={isSelected ? 'secondary' : 'outline'}
              aria-pressed={isSelected}
              onClick={() => onAccountSelect(account)}
              className="mt-4 w-full"
            >
              {isSelected ? (
                <Check aria-hidden="true" />
              ) : (
                <LogIn aria-hidden="true" />
              )}

              {isSelected ? 'Selected' : 'Use this account'}
            </Button>
          </div>
        );
      })}
    </div>

    <div className="mt-5 flex items-start gap-3 border-t border-white/6 pt-5">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/3.5">
        <KeyRound className="size-3.5 text-zinc-500" aria-hidden="true" />
      </div>

      <Typography as="p" variant="caption" className="mt-1.5 text-zinc-700">
        Selecting an account fills both sign-in fields automatically.
      </Typography>
    </div>
  </section>
);
