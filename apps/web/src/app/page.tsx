import Link from 'next/link';
import {
  Link2,
  ShieldCheck,
  Scale3d,
  Search,
  BrainCircuit,
  BarChart3,
  ArrowRight,
} from 'lucide-react';

const HOW_IT_WORKS = [
  {
    layer: 'Layer 01',
    icon: '📋',
    title: 'Policy Evaluation',
    description:
      "The agent's proposed action is checked against your organization's active policy ruleset — GDPR, SOX, HIPAA, or custom governance rules you define.",
  },
  {
    layer: 'Layer 02',
    icon: '⚖',
    title: 'Consensus Validation',
    description:
      'Independent GenLayer validators each evaluate the action against your locked policy. Consensus is reached only when a supermajority agrees on the outcome.',
  },
  {
    layer: 'Layer 03',
    icon: '🔗',
    title: 'Blockchain Accountability',
    description:
      'Every decision — pass, block, escalate — is written immutably onchain. Full audit trail. No tampering. Every validator’s reasoning is recorded.',
  },
];

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Real-Time Policy Enforcement',
    description:
      'Actions are gated at the moment of execution. Your policies run before any API call, database write, or workflow trigger fires.',
  },
  {
    icon: Scale3d,
    title: 'Multi-Validator Consensus',
    description:
      'No single point of authority. Independent validators evaluate in parallel. Consensus decides — not a single rule engine.',
  },
  {
    icon: Search,
    title: 'Explainability Reports',
    description:
      'Every decision comes with a full reasoning trace. Know exactly why an action was blocked, approved, or escalated.',
  },
  {
    icon: Link2,
    title: 'Immutable Audit Trail',
    description:
      'All validation decisions are stored onchain via GenLayer. Tamper-proof. Regulator-ready. Always queryable.',
  },
  {
    icon: BrainCircuit,
    title: 'Human-in-the-Loop Escalation',
    description:
      'High-risk actions trigger automatic human review workflows. Your team stays in control of the decisions that matter.',
  },
  {
    icon: BarChart3,
    title: 'Risk Analytics Dashboard',
    description:
      'Aggregate compliance trends, validator performance, policy drift detection, and risk exposure across all agents.',
  },
];

const QUEUE_ITEMS: Array<{
  status: keyof typeof QUEUE_STYLES;
  icon: string;
  agent: string;
  action: string;
  meta: string;
  score: string;
  chip: string;
}> = [
  {
    status: 'pass',
    icon: '✓',
    agent: 'DataSync Agent v2.1',
    action: 'POST /api/customers/bulk-export — 12,400 records',
    meta: '0x4a7f...c291 · Policy: GDPR-EU-2024 · 3 validators',
    score: '96',
    chip: 'PASS',
  },
  {
    status: 'pending',
    icon: '◌',
    agent: 'FinanceBot Alpha',
    action: 'TRANSFER $84,200 → external-account-7741',
    meta: '0x9c2a...f847 · Policy: SOX-FIN-CTRL · Awaiting consensus',
    score: '—',
    chip: 'VALIDATING',
  },
  {
    status: 'fail',
    icon: '✕',
    agent: 'EmailCampaign Agent',
    action: 'SEND bulk email to 94,000 users — unverified list',
    meta: '0x1b3e...a032 · Policy: CAN-SPAM-2024 · 3/3 validators FAIL',
    score: '12',
    chip: 'BLOCKED',
  },
  {
    status: 'escalated',
    icon: '⚠',
    agent: 'LegalReview AI',
    action: 'SIGN contract — $2.4M vendor agreement — auto-approve',
    meta: '0x7f9b...d514 · Policy: LEGAL-AUTH-L3 · Human review required',
    score: '61',
    chip: 'ESCALATED',
  },
];

const QUEUE_STYLES = {
  pass: {
    bar: 'from-pass to-cornflower',
    iconBg: 'bg-pass/15 border-pass/30',
    score: 'text-pass',
    chip: 'bg-pass/10 text-pass border-pass/25',
  },
  pending: {
    bar: 'from-cornflower to-maxblue',
    iconBg: 'bg-maxblue/15 border-maxblue/30 animate-spin-slow',
    score: 'text-maxblue-2',
    chip: 'bg-maxblue/10 text-maxblue-2 border-maxblue/25',
  },
  fail: {
    bar: 'from-fail to-red-800',
    iconBg: 'bg-fail/15 border-fail/30',
    score: 'text-fail',
    chip: 'bg-fail/10 text-fail border-fail/25',
  },
  escalated: {
    bar: 'from-warn to-orange-700',
    iconBg: 'bg-warn/15 border-warn/30',
    score: 'text-warn',
    chip: 'bg-warn/10 text-warn border-warn/25',
  },
};

const VALIDATORS = [
  { id: 'V1', name: 'Validator Node Alpha', stake: '5,000 GEN', addr: '0x4a7f...9c21', score: 94 },
  { id: 'V2', name: 'Validator Node Beta', stake: '8,200 GEN', addr: '0x8c1b...3f77', score: 97 },
  { id: 'V3', name: 'Validator Node Gamma', stake: '6,750 GEN', addr: '0x2d9e...a841', score: 96 },
];

const BREAKDOWN = [
  { label: 'Policy Adherence', value: 96, color: 'bg-pass' },
  { label: 'User Intent Alignment', value: 91, color: 'bg-cornflower' },
  { label: 'Safety Score', value: 98, color: 'bg-pass' },
];

const COMPLIANCE_DOMAINS = [
  { label: 'Data Privacy', pct: 96, tone: 'hi' },
  { label: 'Financial Controls', pct: 88, tone: 'hi' },
  { label: 'User Intent', pct: 94, tone: 'hi' },
  { label: 'Safety Standards', pct: 72, tone: 'md' },
  { label: 'Legal Governance', pct: 41, tone: 'lo' },
];

const AGENT_RISK = [
  { label: 'DataSync v2.1', pct: 92, tone: 'hi', tag: 'LOW' },
  { label: 'FinanceBot Alpha', pct: 58, tone: 'md', tag: 'MED' },
  { label: 'EmailCampaign', pct: 22, tone: 'lo', tag: 'HIGH' },
  { label: 'LegalReview AI', pct: 64, tone: 'md', tag: 'MED' },
  { label: 'SupportBot v3', pct: 88, tone: 'hi', tag: 'LOW' },
];

const RISK_FILL: Record<string, string> = {
  hi: 'bg-gradient-to-r from-pass-2 to-pass',
  md: 'bg-gradient-to-r from-amber-700 to-warn',
  lo: 'bg-gradient-to-r from-red-800 to-fail',
};
const RISK_TAG_COLOR: Record<string, string> = {
  LOW: 'text-pass',
  MED: 'text-warn',
  HIGH: 'text-fail',
};

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-cerulean-3 font-sans text-eggshell">
      {/* Ambient mesh background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -left-32 -top-40 h-[650px] w-[650px] rounded-full bg-[radial-gradient(circle,rgba(23,124,196,0.55)_0%,rgba(18,68,131,0.2)_55%,transparent_100%)] blur-[110px]" />
        <div className="absolute -right-24 -bottom-24 h-[580px] w-[580px] rounded-full bg-[radial-gradient(circle,rgba(81,171,201,0.4)_0%,rgba(23,124,196,0.15)_50%,transparent_100%)] blur-[110px]" />
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-maxblue/10 bg-cerulean-3/90 backdrop-blur-xl">
        <div className="container flex h-[68px] items-center justify-between">
          <Link href="/" className="flex items-center gap-3 font-heading text-xl font-extrabold tracking-tight">
            <div className="grid h-[34px] w-[34px] place-items-center rounded-lg bg-gradient-to-br from-cornflower to-maxblue shadow-[0_0_20px_rgba(23,124,196,0.5)] animate-glow-pulse">
              ⬡
            </div>
            <span className="text-gradient-sky animate-shimmer tracking-[0.04em]">PRAESIDIUM</span>
          </Link>
          <nav className="hidden items-center gap-9 text-sm font-medium text-eggshell/65 md:flex">
            <a href="#platform" className="transition-colors hover:text-eggshell">Platform</a>
            <a href="#consensus" className="transition-colors hover:text-eggshell">Consensus</a>
            <a href="#risk" className="transition-colors hover:text-eggshell">Analytics</a>
            <Link href="/docs" className="transition-colors hover:text-eggshell">Docs</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/connect" className="px-3 py-2 text-sm font-semibold opacity-70 transition-opacity hover:opacity-100">
              Sign in
            </Link>
            <Link
              href="/connect"
              className="rounded-md bg-gradient-to-r from-cornflower to-maxblue px-5 py-2 text-sm font-bold shadow-[0_2px_18px_rgba(23,124,196,0.45)] transition-transform hover:-translate-y-0.5"
            >
              Request Access
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section className="relative flex min-h-[88vh] flex-col items-center justify-center px-6 pb-20 pt-32 text-center">
          <div className="absolute left-1/2 top-1/2 h-[860px] w-[860px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(23,124,196,0.16)_0%,rgba(81,171,201,0.07)_40%,transparent_68%)] animate-breathe" />
          <div className="relative z-10 mb-9 inline-flex items-center gap-2.5 rounded border border-maxblue/30 bg-maxblue/10 px-5 py-2 font-mono text-xs uppercase tracking-[0.18em] text-maxblue">
            <span className="h-[7px] w-[7px] rounded-full bg-maxblue shadow-[0_0_12px_#51abc9]" />
            Powered by GenLayer Intelligent Contracts
          </div>
          <h1 className="relative z-10 mb-7 max-w-4xl font-heading text-[clamp(3.25rem,9vw,7rem)] font-extrabold leading-none tracking-[-0.04em]">
            <span className="block">Every AI action.</span>
            <span className="block text-gradient-sky animate-shimmer">Validated.</span>
            <span className="block">Before it fires.</span>
          </h1>
          <p className="relative z-10 mb-11 max-w-xl text-lg leading-relaxed text-eggshell/75">
            A decentralized compliance firewall for autonomous AI agents — validating{' '}
            <span className="text-gradient-blue font-medium">policy adherence, user intent, and safety</span> through
            consensus before any action executes.
          </p>
          <div className="relative z-10 flex flex-wrap justify-center gap-4">
            <a
              href="#platform"
              className="group inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cornflower via-cornflower-2 to-maxblue px-8 py-4 font-heading text-base font-bold shadow-[0_3px_22px_rgba(23,124,196,0.5)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_34px_rgba(23,124,196,0.65)]"
            >
              See the Platform
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href="#consensus"
              className="inline-flex items-center gap-2 rounded-lg border-[1.5px] border-eggshell/20 px-8 py-4 font-heading text-base font-bold transition-all hover:-translate-y-0.5 hover:border-maxblue/50 hover:bg-maxblue/10"
            >
              How Consensus Works
            </a>
          </div>
        </section>

        {/* Trust stats */}
        <div className="border-y border-maxblue/15 bg-gradient-to-r from-cerulean-3 via-cerulean/40 to-cerulean-3 py-8">
          <div className="container grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-maxblue/10 md:grid-cols-4">
            {[
              { num: '2.4M+', label: 'Actions Validated' },
              { num: '99.97%', label: 'Consensus Accuracy' },
              { num: '312ms', label: 'Avg Gate Latency' },
              { num: '0', label: 'Unauthorized Executions' },
            ].map((s) => (
              <div key={s.label} className="bg-cerulean-3/70 px-6 py-7 text-center">
                <div className="text-gradient-sky animate-shimmer mb-1.5 font-heading text-4xl font-extrabold tracking-[-0.04em]">
                  {s.num}
                </div>
                <div className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-eggshell/55">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dashboard preview */}
        <div className="mx-8 h-px bg-gradient-to-r from-transparent via-maxblue/30 to-transparent" />
        <section id="platform" className="container py-28">
          <div className="mb-12">
            <div className="mb-4 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.22em] text-cornflower-2">
              <span className="h-0.5 w-6 bg-gradient-to-r from-cornflower to-maxblue" />
              Live Platform
            </div>
            <h2 className="mb-5 font-heading text-[clamp(2.5rem,6vw,4.25rem)] font-extrabold leading-[1.05] tracking-[-0.04em]">
              Your compliance <span className="text-gradient-blue animate-shimmer">control room.</span>
            </h2>
            <div className="mb-5 h-[3px] w-16 rounded bg-gradient-to-r from-cornflower to-maxblue" />
            <p className="max-w-xl text-lg leading-relaxed text-eggshell/65">
              Real-time validation queue, consensus tracking, risk scoring, and full audit trail — all in one
              enterprise dashboard.
            </p>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-maxblue/15 bg-cerulean-3/70">
            <div className="absolute inset-x-0 top-0 h-0.5 animate-slide bg-gradient-to-r from-transparent via-cornflower to-transparent bg-[length:200%_auto]" />
            <div className="flex items-center gap-2 border-b border-maxblue/10 bg-cerulean-3/90 px-6 py-4">
              <span className="h-2.5 w-2.5 rounded-full bg-fail" />
              <span className="h-2.5 w-2.5 rounded-full bg-warn" />
              <span className="h-2.5 w-2.5 rounded-full bg-pass" />
              <span className="ml-3 font-mono text-xs tracking-wide text-eggshell/35">
                app.praesidium.io / dashboard
              </span>
            </div>
            <div className="grid min-h-[480px] grid-cols-1 md:grid-cols-[220px_1fr]">
              <div className="hidden border-r border-maxblue/10 bg-cerulean-3/95 p-6 md:block">
                <div className="mb-8 flex items-center gap-2 px-2 font-heading text-base font-extrabold">
                  <div className="grid h-[22px] w-[22px] place-items-center rounded bg-gradient-to-br from-cornflower to-maxblue text-xs">
                    ⬡
                  </div>
                  PRAESIDIUM
                </div>
                {[
                  { section: 'Overview', items: ['Dashboard', 'Validation Queue', 'Consensus View'] },
                  { section: 'Manage', items: ['Policies', 'Agents', 'Organizations'] },
                  { section: 'Audit', items: ['Audit Trail', 'Risk Analytics', 'Settings'] },
                ].map((group) => (
                  <div key={group.section}>
                    <div className="mb-2 mt-5 px-2 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-eggshell/35">
                      {group.section}
                    </div>
                    {group.items.map((item, idx) => (
                      <div
                        key={item}
                        className={`mb-0.5 flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                          group.section === 'Overview' && idx === 0
                            ? 'border-l-2 border-cornflower bg-gradient-to-r from-cornflower/25 via-maxblue/10 to-transparent text-maxblue-2'
                            : 'text-eggshell/55 hover:bg-maxblue/10 hover:text-eggshell'
                        }`}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div className="overflow-hidden bg-gradient-to-br from-cerulean/25 via-cerulean-3/50 to-cerulean-2/30 p-7">
                <div className="mb-7 flex items-center justify-between">
                  <div>
                    <div className="font-heading text-xl font-bold">Compliance Dashboard</div>
                    <div className="mt-0.5 font-mono text-xs tracking-wide text-eggshell/40">
                      LIVE · Updated 2s ago · Studionet
                    </div>
                  </div>
                  <div className="hidden gap-2.5 sm:flex">
                    <button className="rounded-md border border-maxblue/20 bg-maxblue/10 px-4 py-2 font-heading text-xs font-semibold text-maxblue-2">
                      Export Report
                    </button>
                    <button className="rounded-md bg-gradient-to-r from-cornflower to-maxblue px-4 py-2 font-heading text-xs font-semibold shadow-[0_2px_12px_rgba(23,124,196,0.4)]">
                      + New Policy
                    </button>
                  </div>
                </div>

                <div className="mb-6 grid grid-cols-2 gap-3.5 md:grid-cols-4">
                  {[
                    { num: '1,847', label: 'Total Validations', trend: '↑ 12.4% this week', bar: 'from-cornflower to-maxblue', up: true },
                    { num: '1,623', label: 'Passed', trend: '↑ 87.9% pass rate', bar: 'from-pass to-pass-2', up: true },
                    { num: '148', label: 'Blocked', trend: '↓ 8.0% block rate', bar: 'from-fail to-red-800', up: false },
                    { num: '76', label: 'Escalated', trend: '⚠ 4.1% escalation', bar: 'from-warn to-orange-700', up: undefined },
                  ].map((kpi) => (
                    <div key={kpi.label} className="relative overflow-hidden rounded-lg border border-maxblue/10 bg-gradient-to-br from-cerulean/55 to-cerulean-3/75 p-4">
                      <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${kpi.bar}`} />
                      <div className="mb-1 font-heading text-[1.875rem] font-extrabold tracking-[-0.04em]">{kpi.num}</div>
                      <div className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-eggshell/45">{kpi.label}</div>
                      <div
                        className={`mt-2 text-xs font-medium ${
                          kpi.up === true ? 'text-pass' : kpi.up === false ? 'text-fail' : 'text-warn'
                        }`}
                      >
                        {kpi.trend}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mb-4 flex items-center justify-between">
                  <div className="font-heading text-sm font-bold">Live Validation Queue</div>
                  <div className="rounded border border-maxblue/20 bg-maxblue/10 px-2.5 py-1 font-mono text-xs text-maxblue-2">
                    {QUEUE_ITEMS.length} active
                  </div>
                </div>

                <div className="space-y-2.5">
                  {QUEUE_ITEMS.map((item) => {
                    const style = QUEUE_STYLES[item.status];
                    return (
                      <div
                        key={item.agent}
                        className="relative grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 overflow-hidden rounded-lg border border-maxblue/10 bg-cerulean-3/50 p-3.5 transition-colors hover:border-maxblue/30 hover:bg-cerulean/40"
                      >
                        <div className={`absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b ${style.bar}`} />
                        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border text-sm ${style.iconBg}`}>
                          {item.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="font-heading text-sm font-semibold">{item.agent}</div>
                          <div className="mt-0.5 truncate text-sm text-eggshell/55">{item.action}</div>
                          <div className="mt-0.5 truncate font-mono text-[0.625rem] text-eggshell/30">{item.meta}</div>
                        </div>
                        <div className="hidden text-right sm:block">
                          <div className={`font-heading text-base font-bold ${style.score}`}>{item.score}</div>
                          <div className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-eggshell/40">
                            Score
                          </div>
                        </div>
                        <div className={`rounded px-2.5 py-1 font-mono text-[0.6rem] font-medium uppercase tracking-[0.12em] ${style.chip}`}>
                          {item.chip}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="container py-28">
          <div className="mb-12">
            <div className="mb-4 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.22em] text-cornflower-2">
              <span className="h-0.5 w-6 bg-gradient-to-r from-cornflower to-maxblue" />
              How It Works
            </div>
            <h2 className="mb-5 font-heading text-[clamp(2.5rem,6vw,4.25rem)] font-extrabold leading-[1.05] tracking-[-0.04em]">
              The gate that <span className="text-gradient-blue animate-shimmer">never sleeps.</span>
            </h2>
            <div className="mb-5 h-[3px] w-16 rounded bg-gradient-to-r from-cornflower to-maxblue" />
            <p className="max-w-xl text-lg leading-relaxed text-eggshell/65">
              Every agent action passes through three validation layers before execution. No exceptions.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {HOW_IT_WORKS.map((layer) => (
              <div
                key={layer.layer}
                className="group rounded-xl border border-maxblue/10 bg-gradient-to-br from-cerulean/50 to-cerulean-3/70 p-9 transition-transform hover:-translate-y-1.5"
              >
                <div className="text-gradient-blue mb-5 font-mono text-xs font-bold uppercase tracking-[0.2em]">
                  {layer.layer}
                </div>
                <div className="mb-6 grid h-[52px] w-[52px] place-items-center rounded-xl bg-gradient-to-br from-cerulean to-cornflower text-2xl shadow-[0_4px_20px_rgba(23,124,196,0.3)]">
                  {layer.icon}
                </div>
                <h3 className="mb-2.5 font-heading text-xl font-bold tracking-[-0.02em]">{layer.title}</h3>
                <p className="text-base leading-relaxed text-eggshell/65">{layer.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Consensus viewer */}
        <div className="mx-8 h-px bg-gradient-to-r from-transparent via-maxblue/30 to-transparent" />
        <section id="consensus" className="container py-28">
          <div className="mb-12">
            <div className="mb-4 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.22em] text-cornflower-2">
              <span className="h-0.5 w-6 bg-gradient-to-r from-cornflower to-maxblue" />
              Consensus Engine
            </div>
            <h2 className="mb-5 font-heading text-[clamp(2.5rem,6vw,4.25rem)] font-extrabold leading-[1.05] tracking-[-0.04em]">
              Transparent verdicts. <span className="text-gradient-blue animate-shimmer">Every time.</span>
            </h2>
            <div className="mb-5 h-[3px] w-16 rounded bg-gradient-to-r from-cornflower to-maxblue" />
            <p className="max-w-xl text-lg leading-relaxed text-eggshell/65">
              See exactly how validators evaluated an action. No black boxes. Full explainability.
            </p>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-maxblue/15 bg-cerulean-3/60">
            <div className="absolute inset-x-0 top-0 h-0.5 animate-slide bg-gradient-to-r from-transparent via-cornflower to-transparent bg-[length:200%_auto]" />
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-maxblue/10 px-8 py-6">
              <div>
                <div className="font-heading text-lg font-bold">Consensus Report — Validation #VL-00847</div>
                <div className="mt-0.5 font-mono text-xs tracking-wide text-eggshell/35">
                  Agent: DataSync v2.1 · Action: bulk-export · Policy: GDPR-EU-2024
                </div>
              </div>
              <div className="rounded border border-pass/25 bg-pass/10 px-3.5 py-1.5 font-mono text-xs uppercase tracking-[0.12em] text-pass">
                CONSENSUS PASS
              </div>
            </div>
            <div className="grid md:grid-cols-2">
              <div className="border-b border-maxblue/10 p-8 md:border-b-0 md:border-r">
                <div className="mb-5 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-eggshell/40">
                  Validator Verdicts — 3/3 validators
                </div>
                {VALIDATORS.map((v) => (
                  <div
                    key={v.id}
                    className="mb-2.5 flex items-center gap-4 rounded-md border border-maxblue/10 bg-cerulean-3/50 p-4"
                  >
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-cerulean to-cornflower font-heading text-sm font-bold">
                      {v.id}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-heading text-sm font-semibold">{v.name}</div>
                      <div className="font-mono text-[0.6rem] text-eggshell/35">
                        {v.addr} · Stake: {v.stake}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="font-heading text-base font-bold text-pass">PASS {v.score}</div>
                      <div className="h-1 w-20 overflow-hidden rounded-full bg-maxblue/15">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-pass-2 to-pass"
                          style={{ width: `${v.score}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-8">
                <div className="mb-5 rounded-lg border border-pass/20 bg-gradient-to-br from-pass/10 via-cornflower/15 to-maxblue/10 p-6 text-center">
                  <div className="mb-1.5 font-heading text-2xl font-extrabold tracking-[-0.02em] text-pass">
                    ✓ ACTION APPROVED
                  </div>
                  <div className="text-sm text-eggshell/65">
                    Consensus confidence: <span className="font-semibold text-maxblue-2">95.7%</span> · 3/3 validators
                    · 312ms
                  </div>
                </div>
                <div className="mb-4 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-eggshell/40">
                  Compliance Breakdown
                </div>
                {BREAKDOWN.map((b) => (
                  <div key={b.label} className="flex items-center justify-between border-b border-maxblue/10 py-2.5 last:border-none">
                    <div>
                      <div className="text-sm text-eggshell/65">{b.label}</div>
                      <div className="mt-1 h-[5px] w-24 overflow-hidden rounded-full bg-maxblue/12">
                        <div className={`h-full rounded-full ${b.color}`} style={{ width: `${b.value}%` }} />
                      </div>
                    </div>
                    <div className="font-heading text-sm font-bold">{b.value}%</div>
                  </div>
                ))}
                <div className="flex items-center justify-between py-2.5">
                  <div className="text-sm text-eggshell/65">Risk Exposure</div>
                  <div className="font-heading text-sm font-bold text-warn">LOW</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="container py-28">
          <div className="mb-12">
            <div className="mb-4 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.22em] text-cornflower-2">
              <span className="h-0.5 w-6 bg-gradient-to-r from-cornflower to-maxblue" />
              Platform Features
            </div>
            <h2 className="mb-5 font-heading text-[clamp(2.5rem,6vw,4.25rem)] font-extrabold leading-[1.05] tracking-[-0.04em]">
              Built for <span className="text-gradient-blue animate-shimmer">enterprise governance.</span>
            </h2>
            <div className="mb-5 h-[3px] w-16 rounded bg-gradient-to-r from-cornflower to-maxblue" />
            <p className="max-w-xl text-lg leading-relaxed text-eggshell/65">
              Everything your organization needs to run autonomous AI agents with confidence and accountability.
            </p>
          </div>
          <div className="grid gap-4.5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-lg border border-maxblue/10 bg-gradient-to-br from-cornflower/[0.18] via-cerulean/50 to-cerulean-3/70 p-7 transition-transform hover:-translate-y-1"
              >
                <div className="mb-5 grid h-[46px] w-[46px] place-items-center rounded-xl bg-gradient-to-br from-cerulean to-cornflower shadow-[0_3px_16px_rgba(23,124,196,0.3)]">
                  <feature.icon className="h-5 w-5 text-eggshell" />
                </div>
                <h3 className="mb-2 font-heading text-lg font-bold tracking-[-0.02em]">{feature.title}</h3>
                <p className="text-[0.9375rem] leading-relaxed text-eggshell/60">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Risk analytics */}
        <div className="mx-8 h-px bg-gradient-to-r from-transparent via-maxblue/30 to-transparent" />
        <section id="risk" className="container py-28">
          <div className="mb-12">
            <div className="mb-4 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.22em] text-cornflower-2">
              <span className="h-0.5 w-6 bg-gradient-to-r from-cornflower to-maxblue" />
              Risk Intelligence
            </div>
            <h2 className="mb-5 font-heading text-[clamp(2.5rem,6vw,4.25rem)] font-extrabold leading-[1.05] tracking-[-0.04em]">
              Know your <span className="text-gradient-blue animate-shimmer">exposure instantly.</span>
            </h2>
            <div className="mb-5 h-[3px] w-16 rounded bg-gradient-to-r from-cornflower to-maxblue" />
            <p className="max-w-xl text-lg leading-relaxed text-eggshell/65">
              Live risk scoring across all active agents and policies. Spot anomalies before they become incidents.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="relative overflow-hidden rounded-xl border border-maxblue/10 bg-gradient-to-br from-cerulean/50 to-cerulean-3/75 p-8">
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-cornflower to-maxblue" />
              <div className="mb-5 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-eggshell/40">
                Policy Compliance Rate by Domain
              </div>
              <div className="flex flex-col gap-3">
                {COMPLIANCE_DOMAINS.map((d) => (
                  <div key={d.label} className="flex items-center gap-3.5">
                    <div className="w-32 shrink-0 text-sm text-eggshell/70">{d.label}</div>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-maxblue/10">
                      <div className={`h-full rounded-full transition-all ${RISK_FILL[d.tone]}`} style={{ width: `${d.pct}%` }} />
                    </div>
                    <div className="w-9 text-right font-heading text-sm font-bold">{d.pct}%</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative overflow-hidden rounded-xl border border-maxblue/10 bg-gradient-to-br from-cerulean/50 to-cerulean-3/75 p-8">
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-pass-2 to-pass" />
              <div className="mb-5 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-eggshell/40">
                Agent Risk Classification
              </div>
              <div className="flex flex-col gap-3">
                {AGENT_RISK.map((a) => (
                  <div key={a.label} className="flex items-center gap-3.5">
                    <div className="w-32 shrink-0 text-sm text-eggshell/70">{a.label}</div>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-maxblue/10">
                      <div className={`h-full rounded-full transition-all ${RISK_FILL[a.tone]}`} style={{ width: `${a.pct}%` }} />
                    </div>
                    <div className={`w-9 text-right font-heading text-sm font-bold ${RISK_TAG_COLOR[a.tag]}`}>
                      {a.tag}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="container py-20">
          <div className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl border border-maxblue/20 bg-gradient-to-br from-cerulean-2 via-cerulean-3 to-cerulean/40 px-8 py-20 text-center">
            <div className="absolute inset-x-0 top-0 h-0.5 animate-slide bg-gradient-to-r from-transparent via-cornflower to-transparent bg-[length:200%_auto]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_50%,rgba(81,171,201,0.12),transparent_55%)]" />
            <div className="relative z-10">
              <h2 className="mb-5 font-heading text-[clamp(2.25rem,6vw,4rem)] font-extrabold leading-[1.05] tracking-[-0.04em]">
                Your AI agents need a{' '}
                <span className="text-gradient-blue animate-shimmer">compliance firewall.</span>
              </h2>
              <p className="mx-auto mb-11 max-w-md text-lg leading-relaxed text-eggshell/70">
                Deploy PRAESIDIUM in front of your agent stack. Set your policies. Let GenLayer consensus enforce
                them. Ship autonomous AI with the confidence your organization demands.
              </p>
              <Link
                href="/connect"
                className="inline-flex items-center gap-2 rounded-lg bg-eggshell px-9 py-4 font-heading text-base font-extrabold text-cerulean-3 transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(9,31,69,0.5)]"
              >
                Request Early Access
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-maxblue/10 px-6 py-10 text-center">
        <p className="font-mono text-sm tracking-wide text-eggshell/35">
          PRAESIDIUM · AI Agent Compliance Intelligence · Built on GenLayer Intelligent Contracts · Studionet
        </p>
      </footer>
    </div>
  );
}
