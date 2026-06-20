'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import {
  ArrowLeft,
  Bot,
  RefreshCw,
  Ban,
  CheckCircle,
  Clock,
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { useAgent, useUpdateAgent, useRevokeAgent } from '@/hooks/queries/use-agents';
import { useValidations } from '@/hooks/queries/use-validations';
import { useOrgStore } from '@/stores/org-store';
import { ensureOrgRegisteredOnChain, writeContractAsUser } from '@/lib/genlayer/client';

const TYPE_LABEL: Record<string, string> = {
  chatbot: 'Chatbot',
  workflow: 'Workflow',
  autonomous: 'Autonomous',
  tool_agent: 'Tool Agent',
};

const STATUS_CONFIG: Record<string, { badge: string; label: string }> = {
  active: { badge: 'bg-pass/15 text-pass', label: 'Active' },
  suspended: { badge: 'bg-warn/15 text-warn', label: 'Suspended' },
  revoked: { badge: 'bg-fail/15 text-fail', label: 'Revoked' },
};

const VERDICT_BADGE: Record<string, string> = {
  approved: 'bg-pass/15 text-pass',
  rejected: 'bg-fail/15 text-fail',
  escalated: 'bg-warn/15 text-warn',
  conditional: 'bg-cornflower/15 text-maxblue-2',
};

export default function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { address } = useAccount();
  const { currentOrgName } = useOrgStore();

  const { data, isLoading } = useAgent(id);
  const { data: vData } = useValidations({ agentId: id, limit: 10 });
  const updateAgent = useUpdateAgent();
  const revokeAgent = useRevokeAgent();

  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [chainStatus, setChainStatus] = useState<string | null>(null);

  const agent = data?.agent;
  const validations = (vData?.validations ?? []) as Array<Record<string, unknown>>;

  async function handleRotateKey() {
    setIsRotating(true);
    try {
      const result = await updateAgent.mutateAsync({ id, rotateKey: true });
      if (result.apiKey) setNewApiKey(result.apiKey);
    } finally {
      setIsRotating(false);
    }
  }

  // Calls the on-chain status-change method, registering the agent first
  // if it predates on-chain registration. Best effort — Supabase is always
  // updated regardless of whether this succeeds.
  async function syncAgentStatusOnChain(targetStatus: 'active' | 'suspended' | 'revoked') {
    if (!address || !agent) return;
    const method =
      targetStatus === 'active' ? 'reinstate_agent' : targetStatus === 'suspended' ? 'suspend_agent' : 'revoke_agent';
    try {
      setChainStatus(`Confirm in your wallet to ${method.replace('_', ' ')} on-chain...`);
      await ensureOrgRegisteredOnChain(address, agent.org_id, currentOrgName ?? agent.org_id);
      try {
        await writeContractAsUser(address, method, [id]);
      } catch {
        await writeContractAsUser(address, 'register_agent', [
          id,
          agent.org_id,
          agent.name,
          agent.agent_type,
          true,
          agent.agent_type !== 'chatbot',
        ]);
        if (targetStatus !== 'active') {
          await writeContractAsUser(address, method, [id]);
        }
      }
    } catch (chainErr) {
      console.warn('On-chain agent status sync skipped:', chainErr);
    } finally {
      setChainStatus(null);
    }
  }

  async function handleSuspend() {
    const targetStatus = agent?.status === 'suspended' ? 'active' : 'suspended';
    await updateAgent.mutateAsync({ id, status: targetStatus });
    await syncAgentStatusOnChain(targetStatus);
  }

  async function handleRevoke() {
    await revokeAgent.mutateAsync(id);
    await syncAgentStatusOnChain('revoked');
    router.push('/agents');
  }

  async function copyKey() {
    if (!newApiKey) return;
    await navigator.clipboard.writeText(newApiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Bot className="h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 text-lg font-medium">Agent not found</p>
        <Link href="/agents" className="mt-2 text-sm text-primary hover:underline">
          Back to agents
        </Link>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[agent.status] ?? { badge: 'bg-muted text-muted-foreground', label: agent.status };
  const isRevoked = agent.status === 'revoked';
  const isSuspended = agent.status === 'suspended';

  return (
    <div className="space-y-6">
      {chainStatus && (
        <div className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">{chainStatus}</div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link
            href="/agents"
            className="mt-1 rounded-md p-1.5 hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{agent.name}</h1>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig.badge}`}
              >
                {statusConfig.label}
              </span>
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                {TYPE_LABEL[agent.agent_type] ?? agent.agent_type}
              </span>
            </div>
            {agent.description && (
              <p className="mt-1 text-muted-foreground">{agent.description}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        {!isRevoked && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleSuspend}
              disabled={updateAgent.isPending}
              className={`flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                isSuspended
                  ? 'border-pass/30 text-pass hover:bg-pass/10'
                  : 'border-warn/30 text-warn hover:bg-warn/10'
              }`}
            >
              {isSuspended ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Reactivate
                </>
              ) : (
                <>
                  <Ban className="h-4 w-4" />
                  Suspend
                </>
              )}
            </button>
            {!confirmRevoke ? (
              <button
                onClick={() => setConfirmRevoke(true)}
                className="flex items-center gap-2 rounded-md border border-fail/30 px-4 py-2 text-sm font-medium text-fail hover:bg-fail/10 transition-colors"
              >
                <Ban className="h-4 w-4" />
                Revoke
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-fail">Permanently revoke?</span>
                <button
                  onClick={handleRevoke}
                  disabled={revokeAgent.isPending}
                  className="rounded-md bg-fail px-3 py-1.5 text-sm font-medium text-white hover:bg-fail disabled:opacity-50"
                >
                  Yes, revoke
                </button>
                <button
                  onClick={() => setConfirmRevoke(false)}
                  className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* New API Key Banner */}
      {newApiKey && (
        <div className="rounded-xl border border-warn/30 bg-warn/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warn" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-warn">
                New API key generated — copy it now
              </p>
              <p className="text-sm text-warn">
                This key will not be shown again after you leave this page.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <code className="flex-1 rounded-md bg-warn/15 px-3 py-2 font-mono text-sm text-warn break-all">
                  {newApiKey}
                </code>
                <button
                  onClick={copyKey}
                  className="shrink-0 rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-sm font-medium text-warn hover:bg-warn/15 transition-colors flex items-center gap-1.5"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-pass" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: 'API Key Prefix',
            value: agent.api_key_prefix + '••••••••',
            mono: true,
          },
          {
            label: 'Last Seen',
            value: agent.last_seen_at
              ? new Date(agent.last_seen_at).toLocaleString()
              : 'Never',
          },
          {
            label: 'Registered',
            value: new Date(agent.created_at).toLocaleDateString(),
          },
          {
            label: 'Validations',
            value: String(vData?.pagination?.total ?? '—'),
          },
        ].map(({ label, value, mono }) => (
          <div key={label} className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`mt-1 text-sm font-medium ${mono ? 'font-mono' : ''}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* API key management */}
      {!isRevoked && (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold">API Key</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            The full key is never shown after initial registration. You can rotate the key to
            generate a new one — this immediately invalidates the previous key.
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-md border bg-muted px-3 py-2 font-mono text-sm text-muted-foreground">
              {agent.api_key_prefix}••••••••••••••••••••••••••••••••
            </div>
            <button
              onClick={handleRotateKey}
              disabled={isRotating}
              className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${isRotating ? 'animate-spin' : ''}`} />
              Rotate Key
            </button>
          </div>
        </div>
      )}

      {/* Permissions */}
      {agent.agent_permissions && agent.agent_permissions.length > 0 && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold">Permissions</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Action Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Allowed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Conditions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {agent.agent_permissions.map((perm) => (
                <tr key={perm.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-3 font-mono text-sm">{perm.action_type}</td>
                  <td className="px-6 py-3">
                    {perm.allowed ? (
                      <CheckCircle className="h-4 w-4 text-pass" />
                    ) : (
                      <Ban className="h-4 w-4 text-fail" />
                    )}
                  </td>
                  <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                    {perm.conditions ? JSON.stringify(perm.conditions) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent validations */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Recent Validations</h2>
        {validations.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-10">
            <Clock className="h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">No validations yet</p>
          </div>
        ) : (
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Verdict
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {validations.map((v) => {
                  const results = (v.validation_results as Array<Record<string, unknown>>) ?? [];
                  const result = results[0];
                  const verdict = result?.verdict as string;
                  return (
                    <tr
                      key={v.id as string}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => router.push(`/validations/${v.id}`)}
                    >
                      <td className="px-6 py-3 font-mono text-sm">{v.action_type as string}</td>
                      <td className="px-6 py-3">
                        <span className="text-xs text-muted-foreground">{v.status as string}</span>
                      </td>
                      <td className="px-6 py-3">
                        {verdict && (
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${VERDICT_BADGE[verdict] || ''}`}
                          >
                            {verdict}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-sm font-mono">
                        {result?.compliance_score != null
                          ? `${result.compliance_score}%`
                          : '—'}
                      </td>
                      <td className="px-6 py-3 text-sm text-muted-foreground">
                        {new Date(v.created_at as string).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {(vData?.pagination?.total ?? 0) > 10 && (
              <div className="border-t px-6 py-3 text-sm text-muted-foreground">
                Showing 10 of {vData?.pagination?.total} validations.{' '}
                <Link href={`/validations?agentId=${id}`} className="text-primary hover:underline">
                  View all
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Metadata */}
      {agent.metadata && Object.keys(agent.metadata).length > 0 && (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-3 font-semibold">Metadata</h2>
          <pre className="overflow-auto rounded-md bg-muted px-4 py-3 font-mono text-sm">
            {JSON.stringify(agent.metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
