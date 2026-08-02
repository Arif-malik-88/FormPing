'use client';

import { useCallback, useEffect, useState } from 'react';
import { ROLE_LABEL, type Role } from '@/lib/auth/roles';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { refreshMe } from '@/lib/auth/useMe';
import { BugInbox } from '@/components/team/BugInbox';

interface TeamUser {
  email: string;
  role: Role;
  name: string | null;
  picture: string | null;
}
interface Me {
  email: string;
  role: Role;
}

const ROLE_HELP: Record<Role, string> = {
  owner: 'Full control + manages admins and can transfer ownership.',
  admin: 'Full app including deleting projects and managing members/viewers.',
  member: 'Add URLs, run and edit monitors, view everything. No delete, no user management.',
  viewer: 'Read-only.',
};

export default function TeamPage() {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<TeamUser | null>(null);
  const [confirmTransfer, setConfirmTransfer] = useState<TeamUser | null>(null);
  const [tab, setTab] = useState<'members' | 'bugs'>('members');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/users', { cache: 'no-store' });
      if (res.status === 401 || res.status === 403) return setState('forbidden');
      if (!res.ok) return setState('error');
      const data = await res.json();
      setUsers(Array.isArray(data?.users) ? data.users : []);
      setMe(data?.me ?? null);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const meOwner = me?.role === 'owner';

  /** Roles this actor may assign to a given row (owner is never in the list — that's transfer). */
  function assignableRoles(target: TeamUser): Role[] {
    const base: Role[] = ['viewer', 'member'];
    if (meOwner) base.push('admin');
    // Ensure the row's current role is shown even if it's admin and we're an admin
    // (we can't change it, but the select shouldn't hide the truth).
    if (!base.includes(target.role) && target.role !== 'owner') base.push(target.role);
    return base;
  }

  function canEditRow(u: TeamUser): boolean {
    if (!me) return false;
    if (u.email === me.email) return false; // never your own role
    if (u.role === 'owner') return false; // owner is transfer-only
    if (meOwner) return true;
    // an admin may only manage members/viewers
    return me.role === 'admin' && (u.role === 'member' || u.role === 'viewer');
  }

  async function changeRole(u: TeamUser, next: Role) {
    setBusyEmail(u.email);
    setError(null);
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: u.email, role: next }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setError(body.error ?? 'Could not change that role.');
      await load();
    } finally {
      setBusyEmail(null);
    }
  }

  async function doRemove(u: TeamUser) {
    setBusyEmail(u.email);
    setError(null);
    try {
      const res = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: u.email }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) setError(body.error ?? 'Could not remove that user.');
      await load();
    } finally {
      setBusyEmail(null);
      setConfirmRemove(null);
    }
  }

  async function doTransfer(u: TeamUser) {
    setBusyEmail(u.email);
    setError(null);
    try {
      const res = await fetch('/api/users/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: u.email }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? 'Could not transfer ownership.');
      } else {
        // Ownership changed — the header's cached role is now stale.
        await refreshMe();
      }
      await load();
    } finally {
      setBusyEmail(null);
      setConfirmTransfer(null);
    }
  }

  if (state === 'loading') {
    return (
      <main className="mx-auto max-w-4xl px-4 pb-20 pt-8">
        <div className="fp-skeleton h-6 w-40 rounded" />
        <div className="mt-6 space-y-2">
          {[0, 1, 2].map((i) => <div key={i} className="fp-skeleton h-16 rounded-lg" />)}
        </div>
      </main>
    );
  }

  if (state === 'forbidden') {
    return (
      <main className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h1 className="text-lg font-semibold text-slate-200">Admins only</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          Team &amp; access management is available to admins and the owner. If you need a role
          change, ask an admin or the owner.
        </p>
      </main>
    );
  }

  if (state === 'error') {
    return (
      <main className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h1 className="text-lg font-semibold text-slate-200">Couldn’t load the team</h1>
        <button onClick={() => { setState('loading'); void load(); }} className="mt-3 rounded-lg border border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800">
          Try again
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 pb-20 pt-8">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold tracking-tight text-slate-100">Team &amp; access</h1>
        <div className="mt-4 inline-flex rounded-lg border border-slate-800 bg-slate-900/60 p-0.5">
          <button
            type="button"
            onClick={() => setTab('members')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${tab === 'members' ? 'bg-slate-800 text-slate-100 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Members &amp; roles
          </button>
          <button
            type="button"
            onClick={() => setTab('bugs')}
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${tab === 'bugs' ? 'bg-slate-800 text-slate-100 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Bug reports
          </button>
        </div>
      </div>

      {tab === 'members' && (
      <>
      <p className="mt-4 text-sm text-slate-400">
        Who can do what in FormPing. New sign-ins from an allowed domain start as{' '}
        <strong className="text-slate-300">Member</strong>. Only the owner manages admins or
        transfers ownership.
      </p>

      {error && (
        <div className="mt-4 rounded-lg border border-rose-800/50 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-300">
          {error}
        </div>
      )}

      <div className="mt-5 overflow-hidden rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/60">
            <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isSelf = u.email === me?.email;
              const editable = canEditRow(u);
              const busy = busyEmail === u.email;
              return (
                <tr key={u.email} className="border-t border-slate-800/70">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {u.picture ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.picture} alt="" referrerPolicy="no-referrer" className="h-7 w-7 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-semibold text-white">
                          {(u.name || u.email).charAt(0).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0">
                        <div className="truncate text-slate-200">
                          {u.name || u.email}
                          {isSelf && <span className="ml-1.5 text-[11px] text-slate-500">(you)</span>}
                        </div>
                        {u.name && <div className="truncate text-xs text-slate-500">{u.email}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {u.role === 'owner' ? (
                      <span title={ROLE_HELP.owner} className="inline-flex items-center rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-300 ring-1 ring-amber-500/25">
                        Owner
                      </span>
                    ) : editable ? (
                      <select
                        value={u.role}
                        disabled={busy}
                        onChange={(e) => void changeRole(u, e.target.value as Role)}
                        title={ROLE_HELP[u.role]}
                        className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                      >
                        {assignableRoles(u).map((r) => (
                          <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                        ))}
                      </select>
                    ) : (
                      <span title={ROLE_HELP[u.role]} className="text-xs font-medium text-slate-300">{ROLE_LABEL[u.role]}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      {meOwner && !isSelf && u.role !== 'owner' && (
                        <button
                          type="button"
                          onClick={() => setConfirmTransfer(u)}
                          disabled={busy}
                          className="inline-flex items-center rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-300 transition-colors hover:border-amber-700/60 hover:text-amber-300 disabled:opacity-40"
                          title="Make this person the owner (you become an admin)"
                        >
                          Make owner
                        </button>
                      )}
                      {editable && (
                        <button
                          type="button"
                          onClick={() => setConfirmRemove(u)}
                          disabled={busy}
                          className="inline-flex items-center rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-300 transition-colors hover:border-rose-800/60 hover:text-rose-300 disabled:opacity-40"
                          title="Remove this user (they revert to Member on next sign-in)"
                        >
                          Remove
                        </button>
                      )}
                      {!editable && !(meOwner && !isSelf && u.role !== 'owner') && (
                        <span className="text-[11px] text-slate-700">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-slate-600">
        Removing a user only clears their saved role — they can still sign in (as a Member) if their
        email domain is allowed. To block sign-in entirely, change the allowed domains.
      </p>
      </>
      )}

      {tab === 'bugs' && <BugInbox />}

      <ConfirmDialog
        open={!!confirmRemove}
        variant="danger"
        title={confirmRemove ? `Remove ${confirmRemove.name || confirmRemove.email}?` : ''}
        confirmLabel="Remove user"
        message={<>Clears their saved role. They revert to <strong className="text-slate-300">Member</strong> if they sign in again (assuming their domain is allowed). No projects or data are affected.</>}
        onConfirm={() => { if (confirmRemove) return doRemove(confirmRemove); }}
        onCancel={() => setConfirmRemove(null)}
      />

      <ConfirmDialog
        open={!!confirmTransfer}
        variant="edit"
        title={confirmTransfer ? `Make ${confirmTransfer.name || confirmTransfer.email} the owner?` : ''}
        confirmLabel="Transfer ownership"
        message={
          <>
            <strong className="text-slate-300">{confirmTransfer?.name || confirmTransfer?.email}</strong>{' '}
            becomes the owner and <strong className="text-slate-300">you become an admin</strong>. This
            changes only roles — it never touches projects or data. You can be made owner again by the
            new owner. Continue?
          </>
        }
        onConfirm={() => { if (confirmTransfer) return doTransfer(confirmTransfer); }}
        onCancel={() => setConfirmTransfer(null)}
      />
    </main>
  );
}
