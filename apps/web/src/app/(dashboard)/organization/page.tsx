'use client';

import { useState } from 'react';
import {
  Users,
  UserPlus,
  Trash2,
  Crown,
  Shield,
  User,
  Building2,
  Copy,
  Check,
} from 'lucide-react';
import { useOrgMembers, useInviteMember, useRemoveMember, useUpdateOrg, useOrgMemberships } from '@/hooks/queries/use-org';
import { useOrgStore } from '@/stores/org-store';

const ROLE_CONFIG: Record<string, { icon: React.ElementType; badge: string; label: string }> = {
  owner: { icon: Crown, badge: 'bg-warn/15 text-warn', label: 'Owner' },
  admin: { icon: Shield, badge: 'bg-cornflower/15 text-maxblue-2', label: 'Admin' },
  member: { icon: User, badge: 'bg-muted text-muted-foreground', label: 'Member' },
};

export default function OrganizationPage() {
  const { currentOrgId, currentOrgName, currentOrgSlug } = useOrgStore();
  const { data, isLoading } = useOrgMembers();
  const { data: membershipsData } = useOrgMemberships();
  const inviteMember = useInviteMember();
  const removeMember = useRemoveMember();
  const updateOrg = useUpdateOrg();

  const members = (data?.members ?? []) as Array<Record<string, unknown>>;
  const currentMembership = membershipsData?.memberships?.find((m) => m.org_id === currentOrgId);
  const currentOrganization = currentMembership?.organization;

  const [inviteWallet, setInviteWallet] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  const [orgName, setOrgName] = useState(currentOrgName ?? '');
  const [orgDescription, setOrgDescription] = useState('');
  const [orgSaved, setOrgSaved] = useState(false);

  const [copiedSlug, setCopiedSlug] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  async function handleInvite() {
    setInviteError('');
    setInviteSuccess('');
    if (!inviteWallet.startsWith('0x')) {
      setInviteError('Must be a valid wallet address (starts with 0x)');
      return;
    }
    try {
      await inviteMember.mutateAsync({ walletAddress: inviteWallet, role: inviteRole });
      setInviteSuccess(`Invited ${inviteWallet.slice(0, 10)}... as ${inviteRole}`);
      setInviteWallet('');
    } catch (e) {
      setInviteError((e as Error).message ?? 'Failed to invite member');
    }
  }

  async function handleRemove(userId: string) {
    await removeMember.mutateAsync(userId);
    setConfirmRemove(null);
  }

  async function handleSaveOrg() {
    if (!currentOrgId) return;
    await updateOrg.mutateAsync({
      orgId: currentOrgId,
      name: orgName,
      ...(orgDescription ? { description: orgDescription } : {}),
    });
    setOrgSaved(true);
    setTimeout(() => setOrgSaved(false), 2000);
  }

  async function copySlug() {
    if (!currentOrgSlug) return;
    await navigator.clipboard.writeText(currentOrgSlug);
    setCopiedSlug(true);
    setTimeout(() => setCopiedSlug(false), 2000);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Organization</h1>
        <p className="text-muted-foreground">Manage your organization settings and team.</p>
      </div>

      {/* Org details */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">Organization Details</h2>
          {currentOrganization?.active === false && (
            <span className="rounded-full bg-fail/15 px-2 py-0.5 text-xs font-medium text-fail">Inactive</span>
          )}
          {currentOrganization?._onChainVerified ? (
            <span className="inline-flex rounded-full bg-pass/15 px-2 py-0.5 text-xs font-medium text-pass">
              Verified on-chain
            </span>
          ) : (
            <span className="inline-flex rounded-full bg-warn/15 px-2 py-0.5 text-xs font-medium text-warn">
              Cached (on-chain read failed)
            </span>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Organization Name</label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Slug</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={currentOrgSlug ?? ''}
                readOnly
                className="w-full rounded-md border bg-muted px-3 py-2 font-mono text-sm text-muted-foreground"
              />
              <button
                onClick={copySlug}
                className="shrink-0 rounded-md border px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                {copiedSlug ? (
                  <Check className="h-4 w-4 text-pass" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Share this slug with teammates to join your org.
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Description (optional)</label>
            <textarea
              value={orgDescription}
              onChange={(e) => setOrgDescription(e.target.value)}
              rows={2}
              placeholder="Brief description of your organization..."
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        <div>
          <button
            onClick={handleSaveOrg}
            disabled={updateOrg.isPending || !orgName.trim()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {orgSaved ? 'Saved!' : updateOrg.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Members */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold">Team Members</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {members.length}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="divide-y">
            {members.map((m) => {
              const user = m.user_profile as Record<string, unknown> | null;
              const role = (m.role as string) ?? 'member';
              const roleCfg = ROLE_CONFIG[role] ?? { icon: User, badge: 'bg-muted text-muted-foreground', label: role };
              const RoleIcon = roleCfg.icon;
              const displayName = (user?.display_name as string) ?? 'Unknown';
              const walletAddress = (user?.wallet_address as string) ?? '';
              const isRemoving = confirmRemove === (m.user_id as string);

              return (
                <div
                  key={m.id as string}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors"
                >
                  {/* Avatar */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-medium text-primary text-sm">
                    {displayName.slice(0, 2).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{displayName}</p>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${roleCfg.badge}`}>
                        <RoleIcon className="h-3 w-3" />
                        {roleCfg.label}
                      </span>
                    </div>
                    {walletAddress && (
                      <p className="font-mono text-xs text-muted-foreground">
                        {walletAddress.slice(0, 8)}…{walletAddress.slice(-6)}
                      </p>
                    )}
                  </div>

                  {/* Joined */}
                  <p className="hidden text-xs text-muted-foreground sm:block">
                    Joined {new Date(m.joined_at as string).toLocaleDateString()}
                  </p>

                  {/* Remove */}
                  {role !== 'owner' && (
                    <div className="flex items-center gap-2">
                      {isRemoving ? (
                        <>
                          <span className="text-xs text-fail">Remove?</span>
                          <button
                            onClick={() => handleRemove(m.user_id as string)}
                            disabled={removeMember.isPending}
                            className="rounded-md bg-fail px-2.5 py-1 text-xs font-medium text-white hover:bg-fail disabled:opacity-50"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmRemove(null)}
                            className="rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-accent"
                          >
                            No
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfirmRemove(m.user_id as string)}
                          className="rounded-md p-1.5 text-fail hover:bg-fail/10 transition-colors"
                          title="Remove member"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Invite */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <UserPlus className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Invite Team Member</h2>
            <p className="text-sm text-muted-foreground">
              The wallet must already have a Praesidium account.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium">Wallet Address</label>
            <input
              type="text"
              value={inviteWallet}
              onChange={(e) => setInviteWallet(e.target.value)}
              placeholder="0x..."
              className="w-full rounded-md border bg-background px-3 py-2 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button
            onClick={handleInvite}
            disabled={inviteMember.isPending || !inviteWallet.trim()}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            <UserPlus className="h-4 w-4" />
            {inviteMember.isPending ? 'Inviting…' : 'Invite'}
          </button>
        </div>

        {inviteError && (
          <p className="rounded-md bg-fail/10 px-3 py-2 text-sm text-fail">{inviteError}</p>
        )}
        {inviteSuccess && (
          <p className="rounded-md bg-pass/10 px-3 py-2 text-sm text-pass">{inviteSuccess}</p>
        )}
      </div>
    </div>
  );
}
