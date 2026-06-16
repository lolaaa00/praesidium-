'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useAuth } from '@/hooks/use-auth';
import { truncateAddress } from '@/lib/utils/formatting';

/**
 * Main wallet connect button.
 * States: disconnected → connecting → connected (not signed) → signing → authenticated
 */
export function ConnectButton() {
  const { isConnected, address } = useAccount();
  const { isAuthenticated, isLoading, connectWallet, signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConnect = async () => {
    try {
      setError(null);
      setIsProcessing(true);

      if (!isConnected) {
        await connectWallet();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSignIn = async () => {
    try {
      setError(null);
      setIsProcessing(true);
      await signIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <button
        disabled
        className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-primary/70 px-6 text-sm font-medium text-primary-foreground"
      >
        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
        Loading...
      </button>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="text-center text-sm text-muted-foreground">
        Authenticated. Redirecting...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!isConnected ? (
        <button
          onClick={handleConnect}
          disabled={isProcessing}
          className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              Connecting...
            </>
          ) : (
            <>
              <svg
                className="mr-2 h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 6v3"
                />
              </svg>
              Connect Wallet
            </>
          )}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg border bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">Connected as</p>
            <p className="mt-1 font-mono text-sm font-medium">
              {address ? truncateAddress(address) : '...'}
            </p>
          </div>
          <button
            onClick={handleSignIn}
            disabled={isProcessing}
            className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Signing...
              </>
            ) : (
              'Sign In with Wallet'
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-center text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}
