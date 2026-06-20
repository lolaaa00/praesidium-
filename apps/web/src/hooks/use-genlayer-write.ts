'use client';

import { useCallback } from 'react';
import { useAccount } from 'wagmi';
import { writeContractAsUser } from '@/lib/genlayer/client';

/**
 * Submits a write transaction to PolicyComplianceGate signed by the
 * currently-connected wallet — for org/policy/agent/admin actions a person
 * performs in the dashboard. Throws if no wallet is connected.
 */
export function useGenlayerWrite() {
  const { address, isConnected } = useAccount();

  const writeContract = useCallback(
    async (functionName: string, args: unknown[]) => {
      if (!isConnected || !address) {
        throw new Error('Connect a wallet before submitting this action.');
      }
      return writeContractAsUser(address, functionName, args);
    },
    [address, isConnected],
  );

  return { writeContract, isReady: isConnected && !!address };
}
