'use client';

import { useAuth } from '@/hooks/use-auth';
import { truncateAddress } from '@/lib/utils/formatting';

/**
 * Displays the connected wallet address in the header.
 * Shows a dropdown with logout option.
 */
export function WalletStatus() {
  const { user, isAuthenticated, logout, isLoading, walletMode } = useAuth();

  if (isLoading) {
    return <div className="h-8 w-24 animate-pulse rounded-md bg-muted" />;
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const modeLabel = walletMode === 'generated' ? 'Browser wallet' : 'Connected';

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="text-sm font-medium">
          {user.displayName || truncateAddress(user.walletAddress)}
        </p>
        <p className="font-mono text-xs text-muted-foreground">
          {modeLabel}{user.displayName ? `: ${truncateAddress(user.walletAddress)}` : ''}
        </p>
      </div>
      <button
        onClick={logout}
        className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        title="Disconnect wallet"
      >
        Disconnect
      </button>
    </div>
  );
}
