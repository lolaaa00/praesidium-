'use client';

import { useState } from 'react';
import { useWalletAccount } from '@/hooks/use-wallet-account';
import Link from 'next/link';
import { ArrowLeft, Bot, Copy, Check, AlertTriangle } from 'lucide-react';
import { useRegisterAgent } from '@/hooks/queries/use-agents';
import { useOrgStore } from '@/stores/org-store';
import { ensureOrgRegisteredOnChain, writeContractAsUser, UndeterminedTransactionError } from '@/lib/genlayer/client';
import { getErrorMessage } from '@/lib/utils/errors';

const AGENT_TYPES = [
  { value: 'chatbot', label: 'Chatbot', desc: 'Conversational agent that interacts with users' },
  { value: 'workflow', label: 'Workflow', desc: 'Automated multi-step process executor' },
  { value: 'autonomous', label: 'Autonomous', desc: 'Self-directed agent that makes independent decisions' },
  { value: 'tool_agent', label: 'Tool Agent', desc: 'Agent that executes specific tools or APIs' },
] as const;

export default function RegisterAgentPage() {
  const { address } = useWalletAccount();
  const { currentOrgId, currentOrgName } = useOrgStore();
  const registerAgent = useRegisterAgent();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [agentType, setAgentType] = useState<typeof AGENT_TYPES[number]['value']>('autonomous');
  const [error, setError] = useState('');
  const [chainStatus, setChainStatus] = useState<string | null>(null);
  const [chainUndetermined, setChainUndetermined] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [newAgentAddress, setNewAgentAddress] = useState<string | null>(null);
  const [registeredAgentId, setRegisteredAgentId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function registerAgentOnChain(agentId: string) {
    if (!address || !currentOrgId) return;
    try {
      setChainUndetermined(false);
      setChainStatus('Confirm in your wallet to register the agent on-chain...');
      await ensureOrgRegisteredOnChain(address, currentOrgId, currentOrgName ?? currentOrgId);
      await writeContractAsUser(address, 'register_agent', [
        agentId,
        currentOrgId,
        name.trim(),
        agentType,
        true,
        agentType !== 'chatbot',
      ]);
      setChainStatus(null);
    } catch (chainErr) {
      if (chainErr instanceof UndeterminedTransactionError) {
        setChainStatus(null);
        setChainUndetermined(true);
      } else {
        console.warn('On-chain agent registration failed:', chainErr);
        setChainStatus(
          `On-chain registration failed: ${getErrorMessage(chainErr)}. The agent still works via the engine.`,
        );
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Agent name is required.');
      return;
    }
    try {
      const result = await registerAgent.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        agentType,
      });
      setNewApiKey(result.apiKey);
      setNewAgentAddress(result.agent.genlayer_address ?? null);
      setRegisteredAgentId(result.agent.id);

      // Register the agent on-chain, signed by the registering user. Best
      // effort — the agent already works via the engine regardless, since
      // validate_action stays permissive for unregistered agents.
      if (address && currentOrgId) {
        await registerAgentOnChain(result.agent.id);
      } else {
        setChainStatus(
          `On-chain registration skipped (${!address ? 'no wallet address' : 'no org selected'}). The agent still works via the engine.`,
        );
      }
    } catch (err) {
      setError((err as Error).message ?? 'Failed to register agent.');
    }
  }

  async function copyKey() {
    if (!newApiKey) return;
    await navigator.clipboard.writeText(newApiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Success state — show API key
  if (newApiKey) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/agents" className="rounded-md p-1.5 hover:bg-accent transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Agent Registered</h1>
            <p className="text-muted-foreground">Your agent is ready. Save the API key now.</p>
          </div>
        </div>

        <div className="max-w-2xl space-y-4">
          {chainStatus && (
            <div className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">
              {chainStatus}
            </div>
          )}

          {chainUndetermined && registeredAgentId && (
            <div className="space-y-2 rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm">
              <p className="font-medium text-amber-700 dark:text-amber-400">
                Validators could not agree — nothing was written on-chain. The agent still works via the engine.
              </p>
              <button
                onClick={() => registerAgentOnChain(registeredAgentId)}
                className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                Retry on-chain registration
              </button>
            </div>
          )}

          <div className="rounded-xl border border-warn/30 bg-warn/10 p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warn" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-warn">Copy this API key — shown only once</p>
                <p className="mt-0.5 text-sm text-warn">
                  This key will never be shown again. Store it securely in your agent&apos;s environment variables.
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <code className="flex-1 rounded-md bg-warn/15 px-3 py-2.5 font-mono text-sm text-warn break-all">
                    {newApiKey}
                  </code>
                  <button
                    onClick={copyKey}
                    className="shrink-0 flex items-center gap-1.5 rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-sm font-medium text-warn hover:bg-warn/15 transition-colors"
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

          {newAgentAddress && (
            <div className="rounded-xl border border-primary/30 bg-primary/10 p-5">
              <h2 className="mb-1 font-semibold text-primary">On-chain identity — needs funding</h2>
              <p className="mb-3 text-sm text-primary/80">
                This agent signs its own validate_action calls with this address. It needs a small
                GEN balance on StudioNet to pay gas before its first validation — without funding,
                the engine falls back to local (off-chain) evaluation for this agent.
              </p>
              <code className="block rounded-md bg-primary/15 px-3 py-2.5 font-mono text-sm text-primary break-all">
                {newAgentAddress}
              </code>
            </div>
          )}

          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="mb-3 font-semibold">Using the API key</h2>
            <p className="mb-2 text-sm text-muted-foreground">
              Pass the key in the <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">Authorization</code> header when calling the validation engine:
            </p>
            <pre className="overflow-auto rounded-lg bg-muted px-4 py-3 font-mono text-xs">
{`POST https://your-engine.fly.dev/v1/validate
Authorization: Bearer ${newApiKey.slice(0, 16)}...
Content-Type: application/json

{
  "actionType": "financial_transfer",
  "actionData": { "amount": 5000, "currency": "USD" },
  "context": { "user": "...", "purpose": "..." }
}`}
            </pre>
          </div>

          <div className="flex gap-3">
            <Link
              href="/agents"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              View all agents
            </Link>
            <button
              onClick={() => {
                setNewApiKey(null);
                setName('');
                setDescription('');
              }}
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
              Register another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/agents" className="rounded-md p-1.5 hover:bg-accent transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Register Agent</h1>
          <p className="text-muted-foreground">Register a new AI agent for compliance validation.</p>
        </div>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
          {/* Icon */}
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Bot className="h-6 w-6 text-primary" />
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Agent Name <span className="text-fail">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Financial Operations Agent"
                required
                className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="What does this agent do? What systems does it interact with?"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Agent Type</label>
              <div className="grid gap-2 sm:grid-cols-2">
                {AGENT_TYPES.map((t) => (
                  <label
                    key={t.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                      agentType === t.value
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="agentType"
                      value={t.value}
                      checked={agentType === t.value}
                      onChange={() => setAgentType(t.value)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium">{t.label}</p>
                      <p className="text-xs text-muted-foreground">{t.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-fail/10 border border-fail/30 px-4 py-3 text-sm text-fail">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={registerAgent.isPending || !name.trim()}
              className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {registerAgent.isPending ? 'Registering…' : 'Register Agent'}
            </button>
            <Link
              href="/agents"
              className="rounded-md border px-5 py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
              Cancel
            </Link>
          </div>

          <p className="text-xs text-muted-foreground">
            An API key will be generated on registration. It is shown <strong>once</strong> and
            never stored — copy it immediately.
          </p>
        </form>
      </div>
    </div>
  );
}
