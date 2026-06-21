'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, Users, Shield, Sparkles, ArrowRight } from 'lucide-react';
import { CreateOrgForm } from '@/components/onboarding/create-org-form';
import { JoinOrgForm } from '@/components/onboarding/join-org-form';

type OnboardingStep = 'choose' | 'create' | 'join';

export default function OnboardingPage() {
  const [step, setStep] = useState<OnboardingStep>('choose');

  return (
    <div className="space-y-8">
      {/* Logo */}
      <div className="flex justify-center">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-primary-foreground">P</span>
          </div>
          <span className="text-2xl font-bold">Praesidium</span>
        </Link>
      </div>

      {/* Card */}
      <div className="rounded-2xl border bg-card/95 p-8 shadow-sm backdrop-blur">
        {step === 'choose' && (
          <div className="space-y-7">
            <div className="space-y-3 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Welcome to Praesidium</h1>
              <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                Set up your workspace in a way that matches how your team actually works.
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5" />
                <span>Policies</span>
                <span>•</span>
                <Building2 className="h-3.5 w-3.5" />
                <span>Teams</span>
                <span>•</span>
                <Users className="h-3.5 w-3.5" />
                <span>Memberships</span>
              </div>
            </div>

            <div className="grid gap-3">
              <button
                onClick={() => setStep('create')}
                className="group flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all hover:border-primary/30 hover:bg-accent/50"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary/15">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">Create Organization</p>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Start fresh with a guided setup, templates, and an org slug.
                  </p>
                </div>
              </button>

              <button
                onClick={() => setStep('join')}
                className="group flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all hover:border-primary/30 hover:bg-accent/50"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary/15">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">Join Organization</p>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Enter a team slug and jump into an existing workspace.
                  </p>
                </div>
              </button>
            </div>

            <div className="grid gap-3 rounded-2xl border bg-muted/20 p-4 text-xs text-muted-foreground sm:grid-cols-2">
              <p>Each organization keeps policies, agents, and logs separate.</p>
              <p>You can belong to multiple organizations and switch between them later.</p>
            </div>
          </div>
        )}

        {step === 'create' && <CreateOrgForm onBack={() => setStep('choose')} />}
        {step === 'join' && <JoinOrgForm onBack={() => setStep('choose')} />}
      </div>
    </div>
  );
}
