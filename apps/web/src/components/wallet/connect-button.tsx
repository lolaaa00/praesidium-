'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useAuthStore } from '@/stores/auth-store';
import { truncateAddress } from '@/lib/utils/formatting';

/**
 * Main wallet connect button.
 * States: disconnected → connecting → connected (not signed) → signing → authenticated
 */
export function ConnectButton() {
  const router = useRouter();
  const { isAuthenticated, isLoading, isWalletConnected: isConnected, walletAddress: address, walletMode, connectWallet, signIn } = useAuth();
  const user = useAuthStore((s) => s.user);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasInjectedWallet, setHasInjectedWallet] = useState(true);

  useEffect(() => {
    setHasInjectedWallet(typeof window !== 'undefined' && !!window.ethereum);
  }, []);

  // isAuthenticated can become true from loadSession() finding an existing
  // valid cookie on mount (e.g. you reload /connect while already signed
  // in), not just from the signIn() flow below — and that path never calls
  // router.push(), so without this effect you'd be stuck on this page
  // showing "Redirecting..." forever.
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const hasOrg = user.memberships.length > 0;
    router.push(hasOrg ? '/overview' : '/onboarding');
  }, [isAuthenticated, user, router]);

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
              {hasInjectedWallet ? 'Connect Wallet' : 'Continue without a wallet'}
            </>
          )}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg border bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">
              {walletMode === 'generated' ? 'Browser wallet (generated)' : 'Connected'}
            </p>
            <p className="mt-1 font-mono text-sm font-medium">
              {address ? truncateAddress(address) : '...'}
            </p>
            {walletMode === 'generated' && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                No MetaMask detected — using a wallet generated and stored in this browser.
              </p>
            )}
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
