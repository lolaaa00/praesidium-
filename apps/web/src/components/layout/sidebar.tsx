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
    <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-6">
        <Link href="/overview" className="flex items-center gap-2.5 font-heading font-extrabold">
          <div className="grid h-[26px] w-[26px] place-items-center rounded-md bg-gradient-to-br from-cornflower to-maxblue text-xs shadow-[0_0_14px_rgba(23,124,196,0.45)]">
            ⬡
          </div>
          <span className="text-gradient-sky animate-shimmer tracking-wide">PRAESIDIUM</span>
        </Link>
      </div>

      {/* Org indicator */}
      {orgName && (
        <div className="border-b border-sidebar-border px-6 py-3">
          <p className="truncate font-mono text-xs text-sidebar-foreground/50">{orgName}</p>
        </div>
      )}

      {/* Main nav */}
      <nav className="flex-1 space-y-1 p-3">
        <p className="mb-2 px-3 font-mono text-xs uppercase tracking-wider text-sidebar-foreground/40">
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
                'flex items-center gap-3 rounded-md border-l-2 border-transparent px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'border-cornflower bg-gradient-to-r from-cornflower/25 via-maxblue/10 to-transparent text-maxblue-2'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50',
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}

        <div className="my-4" />

        <p className="mb-2 px-3 font-mono text-xs uppercase tracking-wider text-sidebar-foreground/40">
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
                'flex items-center gap-3 rounded-md border-l-2 border-transparent px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'border-cornflower bg-gradient-to-r from-cornflower/25 via-maxblue/10 to-transparent text-maxblue-2'
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
