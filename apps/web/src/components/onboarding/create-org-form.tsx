'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import {
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Layers3,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { useOrgStore } from '@/stores/org-store';
import { writeContractAsUser } from '@/lib/genlayer/client';
import { getErrorMessage } from '@/lib/utils/errors';

interface CreateOrgFormProps {
  onBack: () => void;
}

const STARTER_TEMPLATES = [
  {
    id: 'ops',
    title: 'Internal Operations',
    description: 'For team workflows, reviews, and policy approvals.',
    name: 'Operations Hub',
    details: 'Best for internal teams managing agents, policies, and escalations.',
  },
  {
    id: 'client',
    title: 'Client Workspace',
    description: 'For a customer or external project with shared access.',
    name: 'Client Control Room',
    details: 'Ideal when you want a branded workspace for one customer or account.',
  },
  {
    id: 'sandbox',
    title: 'Sandbox',
    description: 'For testing policies, agents, and experiments safely.',
    name: 'Policy Sandbox',
    details: 'Great for demos, training, or trying flows before rollout.',
  },
] as const;

export function CreateOrgForm({ onBack }: CreateOrgFormProps) {
  const router = useRouter();
  const { address } = useAccount();
  const { setCurrentOrg } = useOrgStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [chainStatus, setChainStatus] = useState<string | null>(null);
  const [chainError, setChainError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

  function applyTemplate(template: (typeof STARTER_TEMPLATES)[number]) {
    setTemplateId(template.id);
    setName(template.name);
    setDescription(template.details);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/org', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(address ? { 'x-wallet-address': address } : {}),
        },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create organization');
      }

      // Set org in store
      setCurrentOrg({
        id: data.organization.id,
        name: data.organization.name,
        slug: data.organization.slug,
        role: 'owner',
      });

      // Register the org on-chain, signed by the creator's wallet. The org
      // already exists in Supabase regardless of this step, but on failure
      // we stop short of navigating away so the error is actually visible
      // instead of vanishing on route change.
      if (address) {
        try {
          setChainStatus('Confirm in your wallet to register the org on-chain...');
          await writeContractAsUser(address, 'register_org', [data.organization.id, data.organization.name]);
          setChainStatus(null);
        } catch (chainErr) {
          console.warn('On-chain org registration failed:', chainErr);
          setChainStatus(null);
          setChainError(getErrorMessage(chainErr));
          return;
        }
      }

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

      <div className="rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/10 via-background to-background p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Organization setup
            </p>
            <h2 className="mt-1 text-xl font-bold">Create Organization</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Set up a new space for your team, policies, agents, and audit trail.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {STARTER_TEMPLATES.map((template) => {
          const active = templateId === template.id;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => applyTemplate(template)}
              className={`rounded-xl border p-4 text-left transition-all ${
                active
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border bg-card hover:border-primary/30 hover:bg-accent/40'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{template.title}</p>
                {active && <CheckCircle2 className="h-4 w-4 text-primary" />}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{template.description}</p>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="org-name" className="text-sm font-medium">
            Organization Name
          </label>
          <input
            id="org-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Operations Hub"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={isLoading}
            required
            minLength={2}
            maxLength={100}
          />
          {slug && (
            <p className="text-xs text-muted-foreground">
              Slug: <code className="rounded bg-muted px-1 py-0.5">{slug}</code>
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="org-desc" className="text-sm font-medium">
            Description{' '}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <textarea
            id="org-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does your organization do?"
            rows={3}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            disabled={isLoading}
            maxLength={500}
          />
        </div>

        <div className="grid gap-3 rounded-xl border bg-muted/30 p-4 md:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Preview
            </p>
            <p className="font-medium">{name || 'Your organization name'}</p>
            <p className="text-sm text-muted-foreground">
              {description || 'A private workspace for policies, agents, and your team.'}
            </p>
          </div>
          <div className="space-y-1 md:text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Slug
            </p>
            <p className="font-mono text-sm">{slug || 'auto-generated'}</p>
            <p className="text-xs text-muted-foreground">
              Share this with teammates when they join.
            </p>
          </div>
        </div>

        <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
          <div className="flex items-start gap-2 rounded-lg border bg-background/60 p-3">
            <Layers3 className="mt-0.5 h-4 w-4 text-primary" />
            <span>Policies, agents, and audit logs stay isolated per org.</span>
          </div>
          <div className="flex items-start gap-2 rounded-lg border bg-background/60 p-3">
            <ShieldAlert className="mt-0.5 h-4 w-4 text-primary" />
            <span>You can later invite admins, members, and viewers separately.</span>
          </div>
          <div className="flex items-start gap-2 rounded-lg border bg-background/60 p-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
            <span>You’ll land in the dashboard immediately after creation.</span>
          </div>
        </div>

        {chainStatus && (
          <div className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
            {chainStatus}
          </div>
        )}

        {chainError && (
          <div className="space-y-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <p>On-chain org registration failed: {chainError}</p>
            <button
              type="button"
              onClick={() => router.push('/overview')}
              className="rounded-md border border-destructive/30 px-3 py-1 text-xs font-medium hover:bg-destructive/10 transition-colors"
            >
              Continue anyway — the org still exists, you can retry the on-chain step later
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !name.trim()}
          className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Organization'
          )}
        </button>
      </form>
    </div>
  );
}
