'use client';

import { useCallback, useRef, useState } from 'react';
import { writeContractAsUser, UndeterminedTransactionError } from '@/lib/genlayer/client';
import { useWalletAccount } from '@/hooks/use-wallet-account';
import type { TxLifecycleStatus } from '@/components/consensus/tx-lifecycle';

// genlayer-js's waitForTransactionReceipt only resolves once, with the
// final status — it doesn't stream PROPOSING/COMMITTING/REVEALING as they
// happen. We approximate the real consensus phases with a visual cycle
// while the write is in flight, then replace it with the actual outcome
// (ACCEPTED, UNDETERMINED, or error) the moment the receipt resolves.
const VISUAL_PHASES: TxLifecycleStatus[] = ['pending', 'proposing', 'committing', 'revealing'];
const VISUAL_PHASE_INTERVAL_MS = 4000;

/**
 * Submits a write transaction to PolicyComplianceGate, signed by the
 * currently-connected wallet (injected or generated fallback — see
 * lib/wallet/generated-wallet.ts) — for org/policy/agent/admin actions a
 * person performs in the dashboard. Exposes lifecycle state so callers can
 * render <TxLifecycle /> instead of a bare "Confirm in your wallet..." string.
 */
export function useGenlayerWrite() {
  const { address, isConnected } = useWalletAccount();
  const [status, setStatus] = useState<TxLifecycleStatus>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastCall = useRef<{ functionName: string; args: unknown[] } | null>(null);
  const phaseTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPhaseCycle = useCallback(() => {
    if (phaseTimer.current) {
      clearInterval(phaseTimer.current);
      phaseTimer.current = null;
    }
  }, []);

  const writeContract = useCallback(
    async (functionName: string, args: unknown[]) => {
      if (!isConnected || !address) {
        throw new Error('Connect a wallet before submitting this action.');
      }

      lastCall.current = { functionName, args };
      setError(null);
      setTxHash(null);
      setStatus('awaiting_signature');

      try {
        const result = await writeContractAsUser(address, functionName, args, {
          onSubmitted: (hash) => {
            setTxHash(hash);
            let i = 0;
            setStatus(VISUAL_PHASES[0] ?? 'pending');
            phaseTimer.current = setInterval(() => {
              i = Math.min(i + 1, VISUAL_PHASES.length - 1);
              setStatus(VISUAL_PHASES[i] ?? 'pending');
            }, VISUAL_PHASE_INTERVAL_MS);
          },
        });
        stopPhaseCycle();
        setStatus('accepted');
        return result;
      } catch (err) {
        stopPhaseCycle();
        if (err instanceof UndeterminedTransactionError) {
          setTxHash(err.txHash);
          setStatus('undetermined');
        } else {
          setStatus('error');
          setError(err instanceof Error ? err.message : 'Transaction failed.');
        }
        throw err;
      }
    },
    [address, isConnected, stopPhaseCycle],
  );

  const retry = useCallback(async () => {
    if (!lastCall.current) return;
    return writeContract(lastCall.current.functionName, lastCall.current.args);
  }, [writeContract]);

  const reset = useCallback(() => {
    stopPhaseCycle();
    setStatus('idle');
    setTxHash(null);
    setError(null);
  }, [stopPhaseCycle]);

  return { writeContract, isReady: isConnected && !!address, status, txHash, error, retry, reset };
}
