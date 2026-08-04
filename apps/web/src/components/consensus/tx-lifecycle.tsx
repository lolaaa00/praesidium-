'use client';

import { useEffect, useState } from 'react';
import { getExplorerTxUrl } from '@/lib/genlayer/client';

export type TxLifecycleStatus =
  | 'idle'
  | 'awaiting_signature'
  | 'pending'
  | 'proposing'
  | 'committing'
  | 'revealing'
  | 'accepted'
  | 'finalized'
  | 'undetermined'
  | 'error';

const STEP_ORDER: TxLifecycleStatus[] = [
  'pending',
  'proposing',
  'committing',
  'revealing',
  'accepted',
  'finalized',
];

const STEP_LABEL: Record<TxLifecycleStatus, string> = {
  idle: 'Idle',
  awaiting_signature: 'Confirm in your wallet',
  pending: 'Pending',
  proposing: 'Proposing',
  committing: 'Committing',
  revealing: 'Revealing',
  accepted: 'Accepted',
  finalized: 'Finalized',
  undetermined: 'Undetermined',
  error: 'Failed',
};

function useElapsedSeconds(active: boolean) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!active) {
      setSeconds(0);
      return;
    }
    const start = Date.now();
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [active]);

  return seconds;
}

interface TxLifecycleProps {
  status: TxLifecycleStatus;
  txHash?: string | null;
  errorMessage?: string | null;
  onRetry?: () => void;
}

/**
 * Shared progress indicator for GenLayer consensus writes. Every write flow
 * in the dashboard renders this instead of a bare "Confirm in your
 * wallet..." string with no follow-up — it shows the actual consensus
 * phase, an elapsed timer (rounds routinely take tens of seconds), a link
 * to the tx on the StudioNet explorer, and a dedicated UNDETERMINED branch
 * with a retry action.
 */
export function TxLifecycle({ status, txHash, errorMessage, onRetry }: TxLifecycleProps) {
  const [explorerUrl, setExplorerUrl] = useState<string>('');
  const isActive = status !== 'idle' && status !== 'error' && status !== 'undetermined' && status !== 'finalized';
  const elapsed = useElapsedSeconds(isActive);

  useEffect(() => {
    if (!txHash) {
      setExplorerUrl('');
      return;
    }
    getExplorerTxUrl(txHash).then(setExplorerUrl).catch(() => setExplorerUrl(''));
  }, [txHash]);

  if (status === 'idle') return null;

  if (status === 'awaiting_signature') {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
        Confirm in your wallet... ({elapsed}s)
      </div>
    );
  }

  if (status === 'undetermined') {
    return (
      <div className="space-y-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
        <p className="font-medium text-amber-700 dark:text-amber-400">
          Validators could not agree — nothing was written.
        </p>
        <p className="text-muted-foreground">The transaction reached UNDETERMINED status; no state change occurred.</p>
        <div className="flex items-center gap-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              Retry
            </button>
          )}
          {explorerUrl && (
            <a href={explorerUrl} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground underline">
              View on explorer
            </a>
          )}
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="space-y-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm">
        <p className="font-medium text-destructive">{errorMessage || 'Transaction failed.'}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  const currentIndex = STEP_ORDER.indexOf(status);

  return (
    <div className="space-y-3 rounded-lg border bg-muted/50 p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium">{STEP_LABEL[status]}</span>
        <span className="text-xs text-muted-foreground">{elapsed}s elapsed</span>
      </div>
      <div className="flex items-center gap-1">
        {STEP_ORDER.map((step, i) => (
          <div
            key={step}
            className={`h-1.5 flex-1 rounded-full ${
              i <= currentIndex ? 'bg-primary' : 'bg-muted-foreground/20'
            }`}
            title={STEP_LABEL[step]}
          />
        ))}
      </div>
      {txHash && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-mono">{txHash.slice(0, 10)}...{txHash.slice(-8)}</span>
          {explorerUrl && (
            <a href={explorerUrl} target="_blank" rel="noreferrer" className="underline">
              View on explorer
            </a>
          )}
        </div>
      )}
    </div>
  );
}
