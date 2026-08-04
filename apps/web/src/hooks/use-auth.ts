'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useOrgStore } from '@/stores/org-store';
import { buildSignMessage } from '@/lib/wallet/auth';
import { useWalletAccount } from '@/hooks/use-wallet-account';

/**
 * Core auth hook — manages wallet connection, signature-based login,
 * session state, and Supabase auth integration.
 */
export function useAuth() {
  const router = useRouter();
  const { address, isConnected, mode, connect, signMessage, disconnect } = useWalletAccount();
  const { user, isLoading, isAuthenticated, setUser, setLoading, logout: clearAuth } = useAuthStore();
  const { setCurrentOrg, clearOrg } = useOrgStore();

  // Load session on mount
  // biome-ignore lint: loadSession is stable via useCallback
  useEffect(() => { loadSession(); }, []); // eslint-disable-line

  const loadSession = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/session');
      const data = await res.json();

      if (data.user) {
        setUser(data.user);
        // Auto-select first org if user has one
        if (data.user.memberships.length > 0) {
          const first = data.user.memberships[0];
          if (first.organization) {
            setCurrentOrg({
              id: first.organization.id,
              name: first.organization.name,
              slug: first.organization.slug,
              role: first.role,
            });
          }
        }
      } else if (res.ok) {
        // A 200 with no user is a genuine "not signed in" signal from the
        // server (no valid session cookie) — safe to clear.
        setUser(null);
      }
      // A non-2xx response here is a transient failure, not a logout signal
      // (this effect re-runs on every mount of every useAuth() consumer, so
      // a single network blip during navigation shouldn't deauth the user).
      // Leave the existing auth state alone and let the next mount retry.
    } catch {
      // Same reasoning — a fetch failure is not proof the session is gone.
    } finally {
      setLoading(false);
    }
  }, [setUser, setLoading, setCurrentOrg]);

  const connectWallet = useCallback(async () => {
    try {
      if (!isConnected) {
        await connect();
      }
    } catch (error) {
      console.error('Wallet connection failed:', error);
      throw error;
    }
  }, [isConnected, connect]);

  const signIn = useCallback(async () => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    try {
      setLoading(true);

      // 1. Get nonce
      const nonceRes = await fetch('/api/auth/nonce');
      const { nonce } = await nonceRes.json();

      // 2. Build and sign message
      const message = buildSignMessage(nonce);
      const signature = await signMessage(message);

      // 3. Verify on server
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, signature, address }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.error || 'Verification failed');
      }

      setUser({
        id: verifyData.userId,
        walletAddress: verifyData.walletAddress,
        displayName: null,
        avatarUrl: null,
        memberships: [],
      });

      // 4. Load the full session
      await loadSession();

      // 5. Navigate based on state
      if (!verifyData.hasOrg) {
        router.push('/onboarding');
      } else {
        router.push('/overview');
      }

      return verifyData;
    } catch (error) {
      setLoading(false);
      console.error('Sign-in failed:', error);
      throw error;
    }
  }, [address, signMessage, loadSession, router, setLoading]);

  const logout = useCallback(async () => {
    try {
      // Sign out from Supabase
      await fetch('/api/auth/logout', { method: 'POST' });

      // Disconnect wallet
      await disconnect();

      // Clear stores
      clearAuth();
      clearOrg();

      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      clearAuth();
      clearOrg();
      router.push('/');
    }
  }, [disconnect, clearAuth, clearOrg, router]);

  return {
    user,
    isLoading,
    isAuthenticated,
    isWalletConnected: isConnected,
    walletAddress: address,
    walletMode: mode,
    connectWallet,
    signIn,
    logout,
    loadSession,
  };
}
