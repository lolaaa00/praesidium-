'use client';

import { useState } from 'react';
import { useDisconnect } from 'wagmi';
import { LogOut, Wallet, Bell, Shield, Key, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useOrgStore } from '@/stores/org-store';

export default function SettingsPage() {
  const { user, logout } = useAuthStore();
  const { clearOrg } = useOrgStore();
  const { disconnect } = useDisconnect();
  const [confirmLogout, setConfirmLogout] = useState(false);

  const walletAddress = user?.walletAddress ?? '';

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // best-effort
    }
    disconnect();
    logout();
    clearOrg();
    window.location.href = '/connect';
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences.</p>
      </div>

      {/* Account info */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
        <h2 className="font-semibold">Account</h2>

        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
            {walletAddress ? walletAddress.slice(2, 4).toUpperCase() : '??'}
          </div>
          <div>
            <p className="font-medium">{user?.displayName ?? 'Anonymous'}</p>
            <p className="font-mono text-sm text-muted-foreground">
              {walletAddress
                ? `${walletAddress.slice(0, 8)}…${walletAddress.slice(-6)}`
                : 'Not connected'}
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-muted px-4 py-3 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Wallet className="h-4 w-4" />
              <span>Wallet Address</span>
            </div>
            <span className="font-mono">{walletAddress || '—'}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>Memberships</span>
            </div>
            <span>{user?.memberships?.length ?? 0} organization{(user?.memberships?.length ?? 0) !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Notifications (placeholder) */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <h2 className="font-semibold">Notifications</h2>
        <div className="space-y-3">
          {[
            { label: 'Escalation alerts', sub: 'Notify when actions require human review', default: true },
            { label: 'Policy changes', sub: 'Notify when policies are activated or archived', default: true },
            { label: 'Agent registrations', sub: 'Notify when new agents are registered', default: false },
            { label: 'Weekly digest', sub: 'Summary of compliance activity', default: false },
          ].map(({ label, sub, default: on }) => (
            <div key={label} className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{sub}</p>
                </div>
              </div>
              <div
                className={`relative h-5 w-9 cursor-pointer rounded-full transition-colors ${
                  on ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <div
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    on ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Notification preferences are coming in a future update.
        </p>
      </div>

      {/* API access info */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <h2 className="font-semibold">API Access</h2>
        <p className="text-sm text-muted-foreground">
          Agent API keys are managed per-agent. Navigate to an agent's detail page to rotate its key.
        </p>
        <div className="flex items-center gap-3 rounded-lg bg-muted px-4 py-3">
          <Key className="h-4 w-4 text-muted-foreground" />
          <p className="flex-1 text-sm text-muted-foreground">
            Keys use SHA-256 hashing — raw keys are shown once at registration and never stored.
          </p>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-xl border border-red-200 bg-card p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-red-700">Session</h2>
        <p className="text-sm text-muted-foreground">
          Logging out will disconnect your wallet and end your Praesidium session.
        </p>
        {!confirmLogout ? (
          <button
            onClick={() => setConfirmLogout(true)}
            className="flex items-center gap-2 rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm text-red-600">Sign out of Praesidium?</span>
            <button
              onClick={handleLogout}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
            >
              Yes, sign out
            </button>
            <button
              onClick={() => setConfirmLogout(false)}
              className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
