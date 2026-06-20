'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, RefreshCw, Clock, Pause, Play } from 'lucide-react';
import { useContractStatus, contractKeys } from '@/hooks/queries/use-contract';
import { readContractPublic, writeContractAsUser } from '@/lib/genlayer/client';

const STATUS_CONFIG: Record<string, { icon: React.ElementType; badge: string; label: string }> = {
  healthy: { icon: CheckCircle, badge: 'bg-pass/15 text-pass', label: 'Healthy' },
  degraded: { icon: AlertTriangle, badge: 'bg-warn/15 text-warn', label: 'Degraded' },
  offline: { icon: XCircle, badge: 'bg-fail/15 text-fail', label: 'Offline' },
};

const SYSTEM_CHECKS = [
  { key: 'supabase', label: 'Supabase Database', description: 'PostgreSQL + Auth + RLS' },
  { key: 'engine', label: 'Validation Engine', description: 'Fly.io Express service' },
  { key: 'genlayer', label: 'GenLayer Contract', description: 'Intelligent Contract on-chain' },
];

export default function SystemHealthPage() {
  const { data, isLoading, dataUpdatedAt } = useContractStatus();
  const qc = useQueryClient();
  const { address } = useAccount();
  const [chainStatus, setChainStatus] = useState<string | null>(null);

  const status = data?.status ?? 'offline';
  const cfg = STATUS_CONFIG[status] ?? { icon: XCircle, badge: 'bg-fail/15 text-fail', label: 'Offline' };
  const StatusIcon = cfg.icon;

  const { data: isPaused, refetch: refetchPaused } = useQuery({
    queryKey: ['genlayer', 'is_paused'],
    queryFn: () => readContractPublic('is_paused') as Promise<boolean>,
  });

  function handleRefresh() {
    qc.invalidateQueries({ queryKey: contractKeys.status() });
    refetchPaused();
  }

  async function handleTogglePause() {
    if (!address) return;
    try {
      setChainStatus(`Confirm in your wallet to ${isPaused ? 'resume' : 'pause'} validation...`);
      await writeContractAsUser(address, isPaused ? 'unpause' : 'pause', []);
      await refetchPaused();
    } catch (chainErr) {
      console.warn('Pause toggle failed:', chainErr);
    } finally {
      setChainStatus(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="rounded-md p-1.5 hover:bg-accent transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">System Health</h1>
            <p className="text-muted-foreground">Engine and contract status monitoring.</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Overall status banner */}
      <div className={`flex items-center gap-4 rounded-xl border p-5 ${
        status === 'healthy' ? 'border-pass/30 bg-pass/10' :
        status === 'degraded' ? 'border-warn/30 bg-warn/10' :
        'border-fail/30 bg-fail/10'
      }`}>
        <StatusIcon className={`h-8 w-8 ${
          status === 'healthy' ? 'text-pass' :
          status === 'degraded' ? 'text-warn' :
          'text-fail'
        }`} />
        <div>
          <p className="font-semibold text-lg capitalize">{status}</p>
          <p className="text-sm text-muted-foreground">
            {status === 'healthy'
              ? 'All systems operational.'
              : status === 'degraded'
              ? 'Some services are experiencing issues.'
              : 'Validation engine is unreachable. Check Fly.io logs.'}
          </p>
        </div>
        {dataUpdatedAt > 0 && (
          <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            Last checked {new Date(dataUpdatedAt).toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Component checks */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold">Component Status</h2>
        </div>
        <div className="divide-y">
          {SYSTEM_CHECKS.map(({ key, label, description }) => {
            const online = key === 'engine'
              ? status !== 'offline'
              : key === 'genlayer'
              ? status === 'healthy'
              : true; // Supabase — if we're rendering, it's working

            return (
              <div key={key} className="flex items-center gap-4 px-6 py-4">
                <div className={`h-2.5 w-2.5 rounded-full ${online ? 'bg-pass' : 'bg-fail'}`} />
                <div className="flex-1">
                  <p className="font-medium text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <span className={`text-xs font-medium ${online ? 'text-pass' : 'text-fail'}`}>
                  {online ? 'Online' : 'Offline'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Contract info */}
      {data && (
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-3">
          <h2 className="font-semibold">Contract Details</h2>
          <div className="grid gap-3 sm:grid-cols-2 font-mono text-sm">
            {[
              { label: 'Network', value: data.network ?? process.env.NEXT_PUBLIC_GENLAYER_NETWORK ?? 'studionet' },
              { label: 'Address', value: data.contractAddress ?? 'Not deployed' },
              { label: 'Validators', value: data.validators != null ? String(data.validators) : '—' },
              { label: 'Avg Latency', value: data.avgLatencyMs != null ? `${data.avgLatencyMs}ms` : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg bg-muted px-4 py-3">
                <p className="text-xs text-muted-foreground mb-1">{label}</p>
                <p className="truncate">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Validation pause switch */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">Validation Processing</h2>
            <p className="text-sm text-muted-foreground">
              {isPaused
                ? 'validate_action is currently paused — agent submissions are being rejected on-chain.'
                : 'validate_action is running normally.'}
            </p>
          </div>
          <button
            onClick={handleTogglePause}
            disabled={!address}
            title={!address ? 'Connect a wallet to manage this' : undefined}
            className={`flex shrink-0 items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
              isPaused
                ? 'border-pass/30 text-pass hover:bg-pass/10'
                : 'border-warn/30 text-warn hover:bg-warn/10'
            }`}
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            {isPaused ? 'Resume Validation' : 'Pause Validation'}
          </button>
        </div>
        {chainStatus && (
          <div className="mt-3 rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">{chainStatus}</div>
        )}
      </div>

      {/* Environment */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-3">
        <h2 className="font-semibold">Environment</h2>
        <div className="grid gap-3 sm:grid-cols-2 font-mono text-sm">
          {[
            { label: 'NODE_ENV', value: process.env.NODE_ENV ?? 'production' },
            { label: 'GENLAYER_NETWORK', value: process.env.NEXT_PUBLIC_GENLAYER_NETWORK ?? 'studionet' },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg bg-muted px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p>{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
