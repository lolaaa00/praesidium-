'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Shield,
  Bot,
  CheckCircle,
  GitBranch,
  BarChart3,
  ScrollText,
  Building2,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useOrgStore } from '@/stores/org-store';

const NAV_ITEMS = [
  { label: 'Overview', href: '/overview', icon: LayoutDashboard },
  { label: 'Policies', href: '/policies', icon: Shield },
  { label: 'Agents', href: '/agents', icon: Bot },
  { label: 'Validations', href: '/validations', icon: CheckCircle },
  { label: 'Consensus', href: '/consensus', icon: GitBranch },
  { label: 'Risk Analytics', href: '/risk', icon: BarChart3 },
  { label: 'Audit Trail', href: '/audit', icon: ScrollText },
];

const ADMIN_ITEMS = [
  { label: 'Organization', href: '/organization', icon: Building2 },
  { label: 'Settings', href: '/settings', icon: Settings },
  { label: 'Admin', href: '/admin', icon: ShieldCheck },
];

export function Sidebar() {
  const pathname = usePathname();
  const orgName = useOrgStore((s) => s.currentOrgName);

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-sidebar lg:flex lg:flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Link href="/overview" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <span className="text-xs font-bold text-primary-foreground">P</span>
          </div>
          <span className="font-semibold">Praesidium</span>
        </Link>
      </div>

      {/* Org indicator */}
      {orgName && (
        <div className="border-b px-6 py-3">
          <p className="truncate text-xs font-medium text-muted-foreground">{orgName}</p>
        </div>
      )}

      {/* Main nav */}
      <nav className="flex-1 space-y-1 p-3">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Main
        </p>
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50',
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}

        <div className="my-4" />

        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Manage
        </p>
        {ADMIN_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50',
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
