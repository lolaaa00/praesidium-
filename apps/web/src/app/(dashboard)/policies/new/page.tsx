'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';
import { useCreatePolicy } from '@/hooks/queries/use-policies';
import { useOrgStore } from '@/stores/org-store';
import { ensureOrgRegisteredOnChain, writeContractAsUser, hashText } from '@/lib/genlayer/client';
import { getErrorMessage } from '@/lib/utils/errors';

export default function NewPolicyPage() {
  const router = useRouter();
  const { address } = useAccount();
  const { currentOrgId, currentOrgName } = useOrgStore();
  const createPolicy = useCreatePolicy();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [chainStatus, setChainStatus] = useState<string | null>(null);
  const [chainError, setChainError] = useState<string | null>(null);
  const [createdPolicyId, setCreatedPolicyId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Policy name is required.');
      return;
    }
    try {
      const result = await createPolicy.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
      });

      // Register the policy on-chain, signed by the creator. No rules exist
      // yet at creation time, so the hash is a placeholder over the name —
      // it's recomputed for real once rules are added (update_policy_rules).
      if (address && currentOrgId) {
        try {
          setChainStatus('Confirm in your wallet to register the policy on-chain...');
          await ensureOrgRegisteredOnChain(address, currentOrgId, currentOrgName ?? currentOrgId);
          const placeholderHash = await hashText(name.trim());
          await writeContractAsUser(address, 'register_policy', [
            result.policy.id,
            currentOrgId,
            name.trim(),
            placeholderHash,
          ]);
          setChainStatus(null);
        } catch (chainErr) {
          console.warn('On-chain policy registration failed:', chainErr);
          setChainStatus(null);
          setChainError(getErrorMessage(chainErr));
          setCreatedPolicyId(result.policy.id);
          return;
        }
      }

      router.push(`/policies/${result.policy.id}`);
    } catch (err) {
      setError((err as Error).message ?? 'Failed to create policy.');
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/policies" className="rounded-md p-1.5 hover:bg-accent transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Policy</h1>
          <p className="text-muted-foreground">Create a compliance policy. Rules can be added after creation.</p>
        </div>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
          {/* Icon */}
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Policy Name <span className="text-fail">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Financial Operations Safety Policy"
                required
                className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Choose a clear, descriptive name for this compliance policy.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Describe the purpose and scope of this policy..."
                className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          {chainStatus && (
            <div className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
              {chainStatus}
            </div>
          )}

          {chainError && createdPolicyId && (
            <div className="space-y-2 rounded-md bg-fail/10 border border-fail/30 px-4 py-3 text-sm text-fail">
              <p>On-chain policy registration failed: {chainError}</p>
              <button
                type="button"
                onClick={() => router.push(`/policies/${createdPolicyId}`)}
                className="rounded-md border border-fail/30 px-3 py-1 text-xs font-medium hover:bg-fail/10 transition-colors"
              >
                Continue anyway — the policy still exists, retry the on-chain step from its detail page
              </button>
            </div>
          )}

          {error && (
            <div className="rounded-md bg-fail/10 border border-fail/30 px-4 py-3 text-sm text-fail">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={createPolicy.isPending || !name.trim()}
              className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {createPolicy.isPending ? 'Creating…' : 'Create Policy'}
            </button>
            <Link
              href="/policies"
              className="rounded-md border px-5 py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
              Cancel
            </Link>
          </div>

          <p className="text-xs text-muted-foreground">
            The policy will be created as a <strong>draft</strong>. Add rules, then activate it
            when ready to enforce compliance.
          </p>
        </form>
      </div>
    </div>
  );
}
