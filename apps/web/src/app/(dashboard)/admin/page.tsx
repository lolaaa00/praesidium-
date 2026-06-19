'use client';

import Link from 'next/link';
import { Shield, Activity, Building2, ChevronRight } from 'lucide-react';
import { useContractStatus } from '@/hooks/queries/use-contract';

const ADMIN_SECTIONS = [
  {
    href: '/admin/system',
    icon: Activity,
    title: 'System Health',
    description: 'Monitor engine uptime, GenLayer contract status, and error rates.',
  },
  {
    href: '/admin/organizations',
    icon: Building2,
    title: 'Organizations',
    description: 'View and manage all organizations registered on the platform.',
  },
];

export default function AdminPage() {
  const { data: contractStatus } = useContractStatus();

  const isHealthy = contractStatus?.status === 'healthy';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
        <p className="text-muted-foreground">System administration panel.</p>
      </div>

      {/* Quick status */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: 'Contract',
            value: contractStatus?.status ?? 'unknown',
            dot: isHealthy ? 'bg-green-500' : 'bg-amber-400',
          },
          {
            label: 'Network',
            value: contractStatus?.network ?? process.env.NEXT_PUBLIC_GENLAYER_NETWORK ?? 'studionet',
            dot: 'bg-blue-500',
          },
          {
            label: 'Contract Address',
            value: contractStatus?.contractAddress
              ? `${contractStatus.contractAddress.slice(0, 8)}…${contractStatus.contractAddress.slice(-6)}`
              : 'Not deployed',
            dot: contractStatus?.contractAddress ? 'bg-green-500' : 'bg-gray-400',
          },
        ].map(({ label, value, dot }) => (
          <div key={label} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className={`h-2 w-2 rounded-full ${dot}`} />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
            </div>
            <p className="font-mono text-sm font-medium capitalize">{value}</p>
          </div>
        ))}
      </div>

      {/* Navigation cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {ADMIN_SECTIONS.map(({ href, icon: Icon, title, description }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-start gap-4 rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground mt-0.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Admin access only</p>
            <p className="text-sm text-amber-700 mt-0.5">
              This section is restricted to organization owners and admins. Actions taken here
              affect all members and agents in the system.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
