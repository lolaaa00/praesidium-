'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, Users, Shield } from 'lucide-react';
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
      <div className="rounded-xl border bg-card p-8 shadow-sm">
        {step === 'choose' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h1 className="mt-4 text-2xl font-bold tracking-tight">Welcome to Praesidium</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Get started by creating a new organization or joining an existing one.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setStep('create')}
                className="w-full flex items-center gap-4 rounded-lg border p-4 text-left hover:bg-accent/50 transition-colors group"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Create Organization</p>
                  <p className="text-sm text-muted-foreground">
                    Set up a new organization for your team.
                  </p>
                </div>
              </button>

              <button
                onClick={() => setStep('join')}
                className="w-full flex items-center gap-4 rounded-lg border p-4 text-left hover:bg-accent/50 transition-colors group"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Join Organization</p>
                  <p className="text-sm text-muted-foreground">
                    Join an existing team with their organization slug.
                  </p>
                </div>
              </button>
            </div>

            <div className="text-center text-xs text-muted-foreground">
              <p>Organizations isolate policies, agents, and audit trails.</p>
              <p className="mt-1">You can be a member of multiple organizations.</p>
            </div>
          </div>
        )}

        {step === 'create' && <CreateOrgForm onBack={() => setStep('choose')} />}
        {step === 'join' && <JoinOrgForm onBack={() => setStep('choose')} />}
      </div>
    </div>
  );
}
