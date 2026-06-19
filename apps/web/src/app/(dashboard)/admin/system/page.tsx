'use client';

import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, RefreshCw, Clock } from 'lucide-react';
import { useContractStatus } from '@/hooks/queries/use-contract';
import { useQueryClient } from '@tanstack/react-query';
import { contractKeys } from '@/hooks/queries/use-contract';

const STATUS_CONFIG: Record<string, { icon: React.ElementType; badge: string; label: string }> = {
  healthy: { icon: CheckCircle, badge: 'bg-green-100 text-green-700', label: 'Healthy' },
  degraded: { icon: AlertTriangle, badge: 'bg-amber-100 text-amber-700', label: 'Degraded' },
  offline: { icon: XCircle, badge: 'bg-red-100 text-red-700', label: 'Offline' },
};

const SYSTEM_CHECKS = [
  { key: 'supabase', label: 'Supabase Database', description: 'PostgreSQL + Auth + RLS' },
  { key: 'engine', label: 'Validation Engine', description: 'Fly.io Express service' },
  { key: 'genlayer', label: 'GenLayer Contract', description: 'Intelligent Contract on-chain' },
];

export default function SystemHealthPage() {
  const { data, isLoading, dataUpdatedAt } = useContractStatus();
  const qc = useQueryClient();

  const status = data?.status ?? 'offline';
  const cfg = STATUS_CONFIG[status] ?? { icon: XCircle, badge: 'bg-red-100 text-red-700', label: 'Offline' };
  const StatusIcon = cfg.icon;

  function handleRefresh() {
    qc.invalidateQueries({ queryKey: contractKeys.status() });
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
        status === 'healthy' ? 'border-green-200 bg-green-50' :
        status === 'degraded' ? 'border-amber-200 bg-amber-50' :
        'border-red-200 bg-red-50'
      }`}>
        <StatusIcon className={`h-8 w-8 ${
          status === 'healthy' ? 'text-green-600' :
          status === 'degraded' ? 'text-amber-600' :
          'text-red-600'
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
                <div className={`h-2.5 w-2.5 rounded-full ${online ? 'bg-green-500' : 'bg-red-500'}`} />
                <div className="flex-1">
                  <p className="font-medium text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <span className={`text-xs font-medium ${online ? 'text-green-700' : 'text-red-700'}`}>
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
