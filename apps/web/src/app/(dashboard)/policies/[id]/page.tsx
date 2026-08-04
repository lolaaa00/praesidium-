'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useWalletAccount } from '@/hooks/use-wallet-account';
import Link from 'next/link';
import {
  ArrowLeft,
  Shield,
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  Archive,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import {
  usePolicy,
  useUpdatePolicy,
  useDeletePolicy,
  useCreateRule,
  useUpdateRule,
  useDeleteRule,
} from '@/hooks/queries/use-policies';
import { useOrgStore } from '@/stores/org-store';
import { ensureOrgRegisteredOnChain, writeContractAsUser, hashText, UndeterminedTransactionError } from '@/lib/genlayer/client';
import { getErrorMessage } from '@/lib/utils/errors';

const SEVERITY_BADGE: Record<string, string> = {
  low: 'bg-cornflower/15 text-maxblue-2',
  medium: 'bg-warn/15 text-warn',
  high: 'bg-warn/15 text-warn',
  critical: 'bg-fail/15 text-fail',
};

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-pass/15 text-pass',
  archived: 'bg-fail/15 text-fail',
};

interface RuleFormState {
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  condition: string;
  actionTypes: string;
  enabled: boolean;
}

const emptyRule: RuleFormState = {
  name: '',
  description: '',
  severity: 'medium',
  condition: '',
  actionTypes: '',
  enabled: true,
};

export default function PolicyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { address } = useWalletAccount();
  const { currentOrgName } = useOrgStore();

  const { data, isLoading } = usePolicy(id);
  const updatePolicy = useUpdatePolicy();
  const deletePolicy = useDeletePolicy();
  const createRule = useCreateRule();
  const updateRule = useUpdateRule();
  const deleteRuleMutation = useDeleteRule();

  const [showAddRule, setShowAddRule] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleForm, setRuleForm] = useState<RuleFormState>(emptyRule);
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [chainStatus, setChainStatus] = useState<string | null>(null);

  const policy = data?.policy;
  const rules = policy?.policy_rules ?? [];

  function toggleExpanded(ruleId: string) {
    setExpandedRules((prev) => {
      const next = new Set(prev);
      if (next.has(ruleId)) next.delete(ruleId);
      else next.add(ruleId);
      return next;
    });
  }

  function startEditRule(rule: (typeof rules)[0]) {
    setEditingRuleId(rule.id);
    setRuleForm({
      name: rule.name,
      description: rule.description,
      severity: rule.severity,
      condition: rule.rule_definition?.condition ?? '',
      actionTypes: (rule.rule_definition?.actionTypes ?? []).join(', '),
      enabled: rule.enabled,
    });
    setShowAddRule(false);
  }

  function cancelEdit() {
    setEditingRuleId(null);
    setRuleForm(emptyRule);
    setShowAddRule(false);
  }

  async function handleActivate() {
    await updatePolicy.mutateAsync({ id, status: 'active' });

    // Commit a real rules hash on-chain at the moment a policy goes live —
    // not on every edit while it's still a draft, which would mean a wallet
    // signature per rule toggle. Best effort: activation already succeeded
    // in Supabase regardless of whether this on-chain step works.
    if (address && policy) {
      try {
        setChainStatus('Confirm in your wallet to commit the rules hash on-chain...');
        await ensureOrgRegisteredOnChain(address, policy.org_id, currentOrgName ?? policy.org_id);
        const rulesSnapshot = JSON.stringify(
          rules.map((r) => ({
            name: r.name,
            severity: r.severity,
            enabled: r.enabled,
            condition: r.rule_definition?.condition,
            actionTypes: r.rule_definition?.actionTypes,
          })),
        );
        const rulesHash = await hashText(rulesSnapshot);
        try {
          await writeContractAsUser(address, 'update_policy_rules', [id, rulesHash]);
        } catch {
          // Policy predates on-chain registration (created before this
          // feature shipped) — register it now with the real hash instead.
          await writeContractAsUser(address, 'register_policy', [id, policy.org_id, policy.name, rulesHash]);
        }
        setChainStatus(null);
      } catch (chainErr) {
        if (chainErr instanceof UndeterminedTransactionError) {
          setChainStatus('Validators could not agree — nothing was written. Retry the activation to try again.');
        } else {
          console.warn('On-chain rules hash commit failed:', chainErr);
          setChainStatus(
            `On-chain rules hash commit failed: ${getErrorMessage(chainErr)}`,
          );
        }
      }
    } else {
      setChainStatus(
        `On-chain rules hash commit skipped (${!address ? 'no wallet address' : 'policy not loaded'}).`,
      );
    }
  }

  async function handleArchive() {
    await deletePolicy.mutateAsync(id);
    router.push('/policies');
  }

  async function handleSaveRule() {
    const ruleDefinition = {
      condition: ruleForm.condition,
      actionTypes: ruleForm.actionTypes
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };
    if (editingRuleId) {
      await updateRule.mutateAsync({
        policyId: id,
        ruleId: editingRuleId,
        name: ruleForm.name,
        description: ruleForm.description,
        severity: ruleForm.severity,
        ruleDefinition,
        enabled: ruleForm.enabled,
      });
    } else {
      await createRule.mutateAsync({
        policyId: id,
        name: ruleForm.name,
        description: ruleForm.description,
        severity: ruleForm.severity,
        ruleDefinition,
        enabled: ruleForm.enabled,
      });
    }
    cancelEdit();
  }

  async function handleDeleteRule(ruleId: string) {
    await deleteRuleMutation.mutateAsync({ policyId: id, ruleId });
  }

  async function handleToggleRule(rule: (typeof rules)[0]) {
    await updateRule.mutateAsync({
      policyId: id,
      ruleId: rule.id,
      enabled: !rule.enabled,
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

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

  const isArchived = policy.status === 'archived';
  const isDraft = policy.status === 'draft';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link
            href="/policies"
            className="mt-1 rounded-md p-1.5 hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{policy.name}</h1>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[policy.status] || ''}`}
              >
                {policy.status}
              </span>
              <span className="text-sm text-muted-foreground font-mono">v{policy.version}</span>
            </div>
            {policy.description && (
              <p className="mt-1 text-muted-foreground">{policy.description}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        {!isArchived && (
          <div className="flex items-center gap-2">
            {isDraft && (
              <button
                onClick={handleActivate}
                disabled={updatePolicy.isPending}
                className="flex items-center gap-2 rounded-md bg-pass-2 px-4 py-2 text-sm font-medium text-white hover:bg-pass-2 disabled:opacity-50 transition-colors"
              >
                <CheckCircle className="h-4 w-4" />
                Activate
              </button>
            )}
            <Link
              href={`/policies/${id}/edit`}
              className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
            {!confirmArchive ? (
              <button
                onClick={() => setConfirmArchive(true)}
                className="flex items-center gap-2 rounded-md border border-fail/30 px-4 py-2 text-sm font-medium text-fail hover:bg-fail/10 transition-colors"
              >
                <Archive className="h-4 w-4" />
                Archive
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-fail">Are you sure?</span>
                <button
                  onClick={handleArchive}
                  disabled={deletePolicy.isPending}
                  className="rounded-md bg-fail px-3 py-1.5 text-sm font-medium text-white hover:bg-fail disabled:opacity-50"
                >
                  Yes, archive
                </button>
                <button
                  onClick={() => setConfirmArchive(false)}
                  className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {chainStatus && (
        <div className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">{chainStatus}</div>
      )}

      {/* Meta info */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Version', value: `v${policy.version}` },
          { label: 'Rules', value: String(rules.length) },
          { label: 'Created', value: new Date(policy.created_at).toLocaleDateString() },
          { label: 'Last Updated', value: new Date(policy.updated_at).toLocaleDateString() },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 font-mono text-sm font-medium">{value}</p>
          </div>
        ))}
      </div>

      {/* Rules section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Policy Rules</h2>
          {!isArchived && !showAddRule && !editingRuleId && (
            <button
              onClick={() => {
                setShowAddRule(true);
                setRuleForm(emptyRule);
                setEditingRuleId(null);
              }}
              className="flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Rule
            </button>
          )}
        </div>

        {/* Add / Edit Rule Form */}
        {(showAddRule || editingRuleId) && (
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h3 className="mb-4 font-semibold">{editingRuleId ? 'Edit Rule' : 'New Rule'}</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">Rule Name</label>
                <input
                  type="text"
                  value={ruleForm.name}
                  onChange={(e) => setRuleForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. No financial transactions over $10,000"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">Description</label>
                <textarea
                  value={ruleForm.description}
                  onChange={(e) => setRuleForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  placeholder="Describe what this rule enforces..."
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Severity</label>
                <select
                  value={ruleForm.severity}
                  onChange={(e) =>
                    setRuleForm((f) => ({
                      ...f,
                      severity: e.target.value as RuleFormState['severity'],
                    }))
                  }
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Action Types (comma-separated)</label>
                <input
                  type="text"
                  value={ruleForm.actionTypes}
                  onChange={(e) => setRuleForm((f) => ({ ...f, actionTypes: e.target.value }))}
                  placeholder="e.g. financial_transfer, data_export"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">Condition</label>
                <textarea
                  value={ruleForm.condition}
                  onChange={(e) => setRuleForm((f) => ({ ...f, condition: e.target.value }))}
                  rows={3}
                  placeholder="Describe the condition that triggers this rule..."
                  className="w-full rounded-md border bg-background px-3 py-2 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Enabled</label>
                <button
                  type="button"
                  onClick={() => setRuleForm((f) => ({ ...f, enabled: !f.enabled }))}
                >
                  {ruleForm.enabled ? (
                    <ToggleRight className="h-6 w-6 text-pass" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleSaveRule}
                disabled={createRule.isPending || updateRule.isPending || !ruleForm.name}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {editingRuleId ? 'Save Changes' : 'Add Rule'}
              </button>
              <button
                onClick={cancelEdit}
                className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Rules list */}
        {rules.length === 0 && !showAddRule ? (
          <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-12">
            <AlertTriangle className="h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 font-medium">No rules defined</p>
            <p className="text-sm text-muted-foreground">
              Add rules to define what actions this policy enforces.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => {
              const isExpanded = expandedRules.has(rule.id);
              const isEditing = editingRuleId === rule.id;
              return (
                <div
                  key={rule.id}
                  className={`rounded-xl border bg-card shadow-sm transition-all ${isEditing ? 'ring-2 ring-primary' : ''}`}
                >
                  <div className="flex items-center gap-4 px-5 py-4">
                    <button
                      onClick={() => toggleExpanded(rule.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`font-medium ${!rule.enabled ? 'text-muted-foreground line-through' : ''}`}>
                          {rule.name}
                        </p>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_BADGE[rule.severity] || ''}`}
                        >
                          {rule.severity}
                        </span>
                        {!rule.enabled && (
                          <span className="text-xs text-muted-foreground">disabled</span>
                        )}
                      </div>
                      {rule.description && (
                        <p className="mt-0.5 text-sm text-muted-foreground truncate max-w-xl">
                          {rule.description}
                        </p>
                      )}
                    </div>

                    {!isArchived && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleToggleRule(rule)}
                          title={rule.enabled ? 'Disable rule' : 'Enable rule'}
                          className="rounded-md p-1.5 hover:bg-accent transition-colors"
                        >
                          {rule.enabled ? (
                            <ToggleRight className="h-4 w-4 text-pass" />
                          ) : (
                            <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                        <button
                          onClick={() => startEditRule(rule)}
                          className="rounded-md p-1.5 hover:bg-accent transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="rounded-md p-1.5 hover:bg-fail/10 text-fail transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="border-t px-5 py-4 space-y-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Condition
                        </p>
                        <p className="mt-1 font-mono text-sm bg-muted rounded px-3 py-2">
                          {rule.rule_definition?.condition || '—'}
                        </p>
                      </div>
                      {rule.rule_definition?.actionTypes?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Applies to action types
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {rule.rule_definition.actionTypes.map((at) => (
                              <span
                                key={at}
                                className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs"
                              >
                                {at}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Updated {new Date(rule.updated_at).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
