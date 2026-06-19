'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Building2, Search, Users } from 'lucide-react';
import { orgFetch, parseResponse } from '@/lib/api/fetch';

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  settings: Record<string, unknown>;
  _memberCount?: number;
}

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setIsLoading(true);
    orgFetch('/api/org')
      .then((r) => parseResponse<{ organizations: OrgRow[] }>(r))
      .then((d) => setOrgs(d.organizations ?? []))
      .catch(() => setOrgs([]))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = search
    ? orgs.filter(
        (o) =>
          o.name.toLowerCase().includes(search.toLowerCase()) ||
          o.slug.toLowerCase().includes(search.toLowerCase()),
      )
    : orgs;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin" className="rounded-md p-1.5 hover:bg-accent transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
          <p className="text-muted-foreground">All organizations registered on Praesidium.</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search organizations…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-12">
          <Building2 className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-lg font-medium">No organizations found</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Slug</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((org) => (
                <tr key={org.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <p className="font-medium">{org.name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-sm text-muted-foreground">{org.slug}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {new Date(org.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t px-6 py-3 flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {filtered.length} organization{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}
