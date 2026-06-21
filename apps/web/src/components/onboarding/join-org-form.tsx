'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { Users, Loader2, ArrowLeft } from 'lucide-react';
import { useOrgStore } from '@/stores/org-store';

interface JoinOrgFormProps {
  onBack: () => void;
}

export function JoinOrgForm({ onBack }: JoinOrgFormProps) {
  const router = useRouter();
  const { address } = useAccount();
  const { setCurrentOrg } = useOrgStore();
  const [slug, setSlug] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanSlug = slug.trim().toLowerCase();
    if (!cleanSlug) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/org/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(address ? { 'x-wallet-address': address } : {}),
        },
        body: JSON.stringify({ slug: cleanSlug }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to join organization');
      }

      // Set org in store
      setCurrentOrg({
        id: data.organization.id,
        name: data.organization.name,
        slug: data.organization.slug,
        role: 'member',
      });

      router.push('/overview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <h2 className="mt-4 text-xl font-bold">Join Organization</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the organization identifier to join an existing team.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="org-slug" className="text-sm font-medium">
            Organization Identifier
          </label>
          <input
            id="org-slug"
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="acme-ai-corp"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={isLoading}
            required
          />
          <p className="text-xs text-muted-foreground">
            Ask your team admin for the organization slug.
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !slug.trim()}
          className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Joining...
            </>
          ) : (
            'Join Organization'
          )}
        </button>
      </form>
    </div>
  );
}
