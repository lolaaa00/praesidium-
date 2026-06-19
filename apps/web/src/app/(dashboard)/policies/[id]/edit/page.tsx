'use client';

import { useState, use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';
import { usePolicy, useUpdatePolicy } from '@/hooks/queries/use-policies';

export default function EditPolicyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading } = usePolicy(id);
  const updatePolicy = useUpdatePolicy();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [initialized, setInitialized] = useState(false);

  // Initialize form once data loads
  useEffect(() => {
    if (data?.policy && !initialized) {
      setName(data.policy.name as string);
      setDescription((data.policy.description as string) ?? '');
      setInitialized(true);
    }
  }, [data, initialized]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Policy name is required.');
      return;
    }
    try {
      await updatePolicy.mutateAsync({
        id,
        name: name.trim(),
        description: description.trim() || undefined,
      });
      router.push(`/policies/${id}`);
    } catch (err) {
      setError((err as Error).message ?? 'Failed to update policy.');
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const policy = data?.policy;
  if (!policy) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Shield className="h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 text-lg font-medium">Policy not found</p>
        <Link href="/policies" className="mt-2 text-sm text-primary hover:underline">
          Back to policies
        </Link>
      </div>
    );
  }

  if (policy.status === 'archived') {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Shield className="h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 text-lg font-medium">Archived policies cannot be edited</p>
        <Link href={`/policies/${id}`} className="mt-2 text-sm text-primary hover:underline">
          View policy
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/policies/${id}`}
          className="rounded-md p-1.5 hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Policy</h1>
          <p className="text-muted-foreground">Update policy name and description.</p>
        </div>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Policy Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
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

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={updatePolicy.isPending || !name.trim()}
              className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {updatePolicy.isPending ? 'Saving…' : 'Save Changes'}
            </button>
            <Link
              href={`/policies/${id}`}
              className="rounded-md border px-5 py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
