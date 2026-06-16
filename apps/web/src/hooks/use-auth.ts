'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useSignMessage, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { useAuthStore } from '@/stores/auth-store';
import { useOrgStore } from '@/stores/org-store';
import { buildSignMessage } from '@/lib/wallet/auth';
import { createClient } from '@/lib/supabase/client';

/**
 * Core auth hook — manages wallet connection, signature-based login,
 * session state, and Supabase auth integration.
 */
export function useAuth() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { connectAsync } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
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
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, [setUser, setLoading, setCurrentOrg]);

  const connectWallet = useCallback(async () => {
    try {
      // 1. Connect wallet
      if (!isConnected) {
        await connectAsync({ connector: injected() });
      }
    } catch (error) {
      console.error('Wallet connection failed:', error);
      throw error;
    }
  }, [isConnected, connectAsync]);

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
      const signature = await signMessageAsync({ message });

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

      // 4. Complete Supabase auth using the token hash
      if (verifyData.tokenHash && verifyData.email) {
        const supabase = createClient();
        await supabase.auth.verifyOtp({
          email: verifyData.email,
          token: verifyData.tokenHash,
          type: 'magiclink',
        });
      }

      // 5. Load the full session
      await loadSession();

      // 6. Navigate based on state
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
  }, [address, signMessageAsync, loadSession, router, setLoading]);

  const logout = useCallback(async () => {
    try {
      // Sign out from Supabase
      await fetch('/api/auth/logout', { method: 'POST' });
      const supabase = createClient();
      await supabase.auth.signOut();

      // Disconnect wallet
      await disconnectAsync();

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
  }, [disconnectAsync, clearAuth, clearOrg, router]);

  return {
    user,
    isLoading,
    isAuthenticated,
    isWalletConnected: isConnected,
    walletAddress: address,
    connectWallet,
    signIn,
    logout,
    loadSession,
  };
}
