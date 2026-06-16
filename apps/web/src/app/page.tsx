import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">P</span>
            </div>
            <span className="text-xl font-bold">Praesidium</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link
              href="/connect"
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Launch App
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="container flex flex-col items-center justify-center gap-8 py-24 text-center md:py-32">
          <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm text-muted-foreground">
            Powered by GenLayer Consensus
          </div>
          <h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Compliance Firewall for{' '}
            <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
              AI Agents
            </span>
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Validate policy adherence, user intent, and safety through decentralized
            multi-validator consensus — before autonomous actions are executed.
          </p>
          <div className="flex gap-4">
            <Link
              href="/connect"
              className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Get Started
            </Link>
            <Link
              href="/docs"
              className="inline-flex h-12 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Documentation
            </Link>
          </div>
        </section>

        {/* Features Grid */}
        <section className="container py-16">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: 'Real-Time Policy Enforcement',
                description:
                  'Every AI agent action is validated against your organization\'s policies before execution.',
              },
              {
                title: 'Multi-Validator Consensus',
                description:
                  'Independent validators evaluate compliance using LLM-powered reasoning with GenLayer consensus.',
              },
              {
                title: 'Risk Scoring & Analytics',
                description:
                  'Continuous risk assessment with compliance scoring, trend analysis, and agent reputation tracking.',
              },
              {
                title: 'Human-in-the-Loop',
                description:
                  'Borderline decisions are escalated to human reviewers with full context and recommendations.',
              },
              {
                title: 'Immutable Audit Trail',
                description:
                  'Every validation decision is recorded on-chain for transparent, tamper-proof accountability.',
              },
              {
                title: 'Enterprise Policy Management',
                description:
                  'Version-controlled policies with rule builders, severity levels, and organizational scoping.',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-sm text-muted-foreground">
            Built with GenLayer Intelligent Contracts
          </p>
          <div className="flex gap-6">
            <Link href="/docs" className="text-sm text-muted-foreground hover:underline">
              Docs
            </Link>
            <Link href="/about" className="text-sm text-muted-foreground hover:underline">
              About
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
