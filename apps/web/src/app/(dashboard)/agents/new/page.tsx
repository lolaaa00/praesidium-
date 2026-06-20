'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { ArrowLeft, Bot, Copy, Check, AlertTriangle } from 'lucide-react';
import { useRegisterAgent } from '@/hooks/queries/use-agents';
import { useOrgStore } from '@/stores/org-store';
import { ensureOrgRegisteredOnChain, writeContractAsUser } from '@/lib/genlayer/client';

const AGENT_TYPES = [
  { value: 'chatbot', label: 'Chatbot', desc: 'Conversational agent that interacts with users' },
  { value: 'workflow', label: 'Workflow', desc: 'Automated multi-step process executor' },
  { value: 'autonomous', label: 'Autonomous', desc: 'Self-directed agent that makes independent decisions' },
  { value: 'tool_agent', label: 'Tool Agent', desc: 'Agent that executes specific tools or APIs' },
] as const;

export default function RegisterAgentPage() {
  const router = useRouter();
  const { address } = useAccount();
  const { currentOrgId, currentOrgName } = useOrgStore();
  const registerAgent = useRegisterAgent();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [agentType, setAgentType] = useState<typeof AGENT_TYPES[number]['value']>('autonomous');
  const [error, setError] = useState('');
  const [chainStatus, setChainStatus] = useState<string | null>(null);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

      // Register the agent on-chain, signed by the registering user. Best
      // effort — the agent already works via the engine regardless, since
      // validate_action stays permissive for unregistered agents.
      if (address && currentOrgId) {
        try {
          setChainStatus('Confirm in your wallet to register the agent on-chain...');
          await ensureOrgRegisteredOnChain(address, currentOrgId, currentOrgName ?? currentOrgId);
          await writeContractAsUser(address, 'register_agent', [
            result.agent.id,
            currentOrgId,
            name.trim(),
            agentType,
            true,
            agentType !== 'chatbot',
          ]);
        } catch (chainErr) {
          console.warn('On-chain agent registration skipped:', chainErr);
        } finally {
          setChainStatus(null);
        }
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
