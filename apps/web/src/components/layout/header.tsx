'use client';

import { Menu } from 'lucide-react';
import { WalletStatus } from '@/components/wallet/wallet-status';
import { useOrgStore } from '@/stores/org-store';

export function Header() {
  const orgName = useOrgStore((s) => s.currentOrgName);

  return (
    <header className="flex h-16 items-center justify-between border-b border-border px-6">
      <div className="flex items-center gap-4">
        {/* Mobile menu toggle — will be wired later */}
        <button className="rounded-md p-2 hover:bg-accent lg:hidden">
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-mono text-sm font-medium text-muted-foreground lg:hidden">
          {orgName || 'Praesidium'}
        </span>
      </div>

      <WalletStatus />
    </header>
  );
}
