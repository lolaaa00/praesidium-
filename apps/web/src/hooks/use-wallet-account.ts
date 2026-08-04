'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAccount, useConnect, useDisconnect, useSignMessage } from 'wagmi';
import { injected } from 'wagmi';
import { getOrCreateGeneratedWallet, getStoredGeneratedWallet, clearGeneratedWallet } from '@/lib/wallet/generated-wallet';

export type WalletMode = 'injected' | 'generated' | null;

/**
 * Unifies wagmi's injected-wallet connection with the local generated-wallet
 * fallback so the rest of the app (auth flow, write actions, status UI) can
 * treat "connected" uniformly regardless of which one is active.
 *
 * Injected wallets always win if present — the generated wallet only kicks
 * in when there's no window.ethereum to talk to.
 */
export function useWalletAccount() {
  const { address: injectedAddress, isConnected: isInjectedConnected } = useAccount();
  const { connectAsync } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  const [generatedAddress, setGeneratedAddress] = useState<`0x${string}` | null>(null);
  const [hasInjectedProvider, setHasInjectedProvider] = useState(false);

  useEffect(() => {
    setHasInjectedProvider(typeof window !== 'undefined' && !!window.ethereum);
    const existing = getStoredGeneratedWallet();
    if (existing) setGeneratedAddress(existing.address);
  }, []);

  const mode: WalletMode = isInjectedConnected ? 'injected' : generatedAddress ? 'generated' : null;
  const address = isInjectedConnected ? injectedAddress : (generatedAddress ?? undefined);
  const isConnected = isInjectedConnected || !!generatedAddress;

  /**
   * Connects using whatever's available: an injected wallet if one exists,
   * otherwise silently generates (or reuses) a local wallet — zero friction,
   * zero extra dialogs.
   */
  const connect = useCallback(async () => {
    if (hasInjectedProvider) {
      await connectAsync({ connector: injected() });
      return;
    }
    const wallet = await getOrCreateGeneratedWallet();
    setGeneratedAddress(wallet.address);
  }, [hasInjectedProvider, connectAsync]);

  const signMessage = useCallback(
    async (message: string): Promise<string> => {
      if (mode === 'injected') {
        return signMessageAsync({ message });
      }
      const wallet = getStoredGeneratedWallet();
      if (!wallet) throw new Error('No generated wallet available to sign with.');
      const { privateKeyToAccount } = await import('viem/accounts');
      const account = privateKeyToAccount(wallet.privateKey);
      return account.signMessage({ message });
    },
    [mode, signMessageAsync],
  );

  const disconnect = useCallback(async () => {
    if (isInjectedConnected) {
      await disconnectAsync();
    }
    clearGeneratedWallet();
    setGeneratedAddress(null);
  }, [isInjectedConnected, disconnectAsync]);

  return { address, isConnected, mode, hasInjectedProvider, connect, signMessage, disconnect };
}
