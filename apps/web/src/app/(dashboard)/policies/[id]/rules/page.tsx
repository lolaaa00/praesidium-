'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Shield } from 'lucide-react';
import { usePolicyRules, useCreateRule, useDeleteRule } from '@/hooks/queries/use-policies';

const SEVERITY_BADGE: Record<string, string> = {
  low: 'bg-cornflower/15 text-maxblue-2',
  medium: 'bg-warn/15 text-warn',
  high: 'bg-warn/15 text-warn',
  critical: 'bg-fail/15 text-fail',
};

const SEVERITY_OPTIONS = ['low', 'medium', 'high', 'critical'] as const;

export default function PolicyRulesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading } = usePolicyRules(id);
  const createRule = useCreateRule();
  const deleteRule = useDeleteRule();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<(typeof SEVERITY_OPTIONS)[number]>('medium');
  const [condition, setCondition] = useState('');
  const [actionTypesInput, setActionTypesInput] = useState('');

  const rules = data?.rules ?? [];

  async function submitRule() {
    const actionTypes = actionTypesInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!name.trim() || !description.trim() || !condition.trim() || actionTypes.length === 0) return;

    await createRule.mutateAsync({
      policyId: id,
      name: name.trim(),
      description: description.trim(),
      severity,
      ruleDefinition: { condition: condition.trim(), actionTypes },
    });

    setName('');
    setDescription('');
    setSeverity('medium');
    setCondition('');
    setActionTypesInput('');
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/policies/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to policy
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Policy Rules</h1>
        <p className="text-muted-foreground">
          Structured rules the validation engine checks agent actions against — separate from the
          policy&apos;s free-text summary. At least one rule is required before a policy can validate
          actions.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6 space-y-3">
        <h2 className="font-medium">Add a rule</h2>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Rule name (e.g. No bulk export without consent)"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description — what this rule checks and why"
          rows={2}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none"
        />
        <div className="grid grid-cols-2 gap-3">
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as typeof severity)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            {SEVERITY_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            value={actionTypesInput}
            onChange={(e) => setActionTypesInput(e.target.value)}
            placeholder="Action types, comma-separated (e.g. data_export, financial_transfer)"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
        <input
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          placeholder="Condition (e.g. no bulk export without verified consent)"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
        <button
          onClick={submitRule}
          disabled={createRule.isPending}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {createRule.isPending ? 'Adding…' : 'Add rule'}
        </button>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border py-12">
            <Shield className="h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">No rules yet — add one above.</p>
          </div>
        ) : (
          rules.map((rule) => (
            <div key={rule.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{rule.name}</span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-medium ${SEVERITY_BADGE[rule.severity]}`}
                    >
                      {rule.severity}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{rule.description}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Condition: <span className="font-mono">{rule.rule_definition.condition}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Applies to: {rule.rule_definition.actionTypes.join(', ')}
                  </p>
                </div>
                <button
                  onClick={() => deleteRule.mutate({ policyId: id, ruleId: rule.id })}
                  disabled={deleteRule.isPending}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  aria-label="Delete rule"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
