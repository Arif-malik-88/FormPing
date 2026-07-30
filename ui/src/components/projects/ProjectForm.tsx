'use client';

import { useCallback, useState } from 'react';
import type { Project } from '@/lib/projects/types';
import { urlKey } from '@/lib/projects/projectStore';
import { checkUrl } from '@/lib/urlCheck';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

/** Format check: a parseable http(s) URL with a real (dotted) hostname. */
function isValidUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    return /^https?:$/.test(u.protocol) && u.hostname.includes('.');
  } catch {
    return false;
  }
}

interface DupWarning {
  dups: Array<{ url: string; projects: Array<{ id: string; name: string }> }>;
  unreachable: string[];
}

/**
 * Add / edit a project. ONE form for both (DRY): pass `project` to edit, omit to
 * add. URLs are entered as individual fields (add/remove rows) with inline format
 * validation. On save it warns about URLs already in another project or that
 * don't respond (soft — "Add anyway"), and about removed URLs on edit (FR-17).
 */
export function ProjectForm({
  project,
  onSaved,
  onCancel,
}: {
  project?: Project | null;
  onSaved: (result?: { projectDeleted?: boolean }) => void;
  onCancel: () => void;
}) {
  const editing = Boolean(project);
  const [name, setName] = useState(project?.name ?? '');
  const [urls, setUrls] = useState<string[]>(() => {
    const initial = project?.urls ?? [];
    return initial.length ? [...initial] : [''];
  });
  const [notes, setNotes] = useState(project?.notes ?? '');
  const [contact, setContact] = useState(project?.contact ?? '');
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false); // reveal inline format errors after a save attempt
  const [confirmEdit, setConfirmEdit] = useState(false);
  const [warning, setWarning] = useState<DupWarning | null>(null);

  const originalUrls = project?.urls ?? [];
  const filledUrls = urls.map((u) => u.trim()).filter(Boolean);
  const removedUrls = editing
    ? originalUrls.filter((o) => !filledUrls.some((n) => urlKey(n) === urlKey(o)))
    : [];
  const invalidCount = urls.filter((u) => u.trim() && !isValidUrl(u)).length;

  const setUrlAt = (i: number, val: string) => setUrls((prev) => prev.map((u, idx) => (idx === i ? val : u)));
  const addRow = () => setUrls((prev) => [...prev, '']);
  const removeRow = (i: number) =>
    setUrls((prev) => (prev.length === 1 ? [''] : prev.filter((_, idx) => idx !== i)));

  const doSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(editing ? `/api/projects/${project!.id}` : '/api/projects', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          urls: filledUrls,
          notes: notes.trim() || undefined,
          contact: contact.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || (editing ? 'Could not save changes' : 'Could not create project'));
        return;
      }
      // Editing a project down to zero URLs deletes it (FR-27) — signal the parent.
      onSaved(data?.projectDeleted ? { projectDeleted: true } : undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setSaving(false);
      setConfirmEdit(false);
    }
  }, [editing, project, name, filledUrls, notes, contact, onSaved]);

  // Save, after any warnings are resolved. On edit, still confirm removed URLs (FR-17).
  const proceed = useCallback(() => {
    if (editing && removedUrls.length > 0) {
      setConfirmEdit(true);
      return;
    }
    void doSave();
  }, [editing, removedUrls.length, doSave]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Enter a project name');
      return;
    }
    if (invalidCount > 0) {
      setShowErrors(true);
      setError(`Fix the highlighted URL${invalidCount === 1 ? '' : 's'} first.`);
      return;
    }
    if (filledUrls.length === 0) {
      proceed();
      return;
    }

    // Soft, fail-open checks: any URL already in ANOTHER project (matchKey-aware),
    // and any that don't respond. Neither blocks — a URL can live in several
    // projects and a live site can be briefly down.
    setChecking(true);
    try {
      const qs = new URLSearchParams();
      filledUrls.forEach((u) => qs.append('url', u));
      if (editing && project) qs.set('exclude', project.id);
      const [dupData, checks] = await Promise.all([
        fetch(`/api/projects/url-owners?${qs.toString()}`, { cache: 'no-store' })
          .then((r) => r.json())
          .catch(() => ({ duplicates: [] })),
        Promise.all(filledUrls.map((u) => checkUrl(u))),
      ]);
      const dups = Array.isArray(dupData?.duplicates) ? dupData.duplicates : [];
      const unreachable = checks.filter((c) => c.ok && !c.reachable).map((c) => c.input);
      if (dups.length > 0 || unreachable.length > 0) {
        setWarning({ dups, unreachable });
        return;
      }
    } catch {
      /* checks failed — proceed anyway */
    } finally {
      setChecking(false);
    }
    proceed();
  }

  const input =
    'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-40';
  const label = 'block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5';

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label className={label}>Client / project name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Inc." disabled={saving} className={input} autoFocus />
        <label className={`${label} mt-3`}>Notes <span className="normal-case text-slate-600">(optional)</span></label>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything worth noting" disabled={saving} className={input} />
        <label className={`${label} mt-3`}>Contact <span className="normal-case text-slate-600">(optional — email / Slack / name)</span></label>
        <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="who to notify — e.g. dev@client.com" disabled={saving} className={input} />
      </div>
      <div>
        <label className={label}>URLs to track</label>
        <div className="space-y-2">
          {urls.map((u, i) => {
            const invalid = showErrors && u.trim().length > 0 && !isValidUrl(u);
            return (
              <div key={i}>
                <div className="flex items-center gap-2">
                  <input
                    value={u}
                    onChange={(e) => setUrlAt(i, e.target.value)}
                    placeholder="https://acme.com/page"
                    disabled={saving}
                    aria-invalid={invalid}
                    className={`${input} font-mono ${invalid ? 'border-red-700 focus:ring-red-500' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    disabled={saving}
                    title="Remove this URL"
                    aria-label="Remove this URL"
                    className="shrink-0 rounded-lg border border-slate-700 px-2.5 py-2 text-slate-500 hover:border-red-800/60 hover:text-red-300 disabled:opacity-40"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </button>
                </div>
                {invalid && (
                  <p className="mt-1 text-[11px] text-red-400">Not a valid URL — use https://domain.com</p>
                )}
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={addRow}
          disabled={saving}
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-300 hover:text-indigo-200 disabled:opacity-40"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden><path d="M10 5a.75.75 0 01.75.75v3.5h3.5a.75.75 0 010 1.5h-3.5v3.5a.75.75 0 01-1.5 0v-3.5h-3.5a.75.75 0 010-1.5h3.5v-3.5A.75.75 0 0110 5z" /></svg>
          Add URL
        </button>
        <p className="mt-2 text-[11px] text-slate-600">
          One field per page or site for this client (homepage, contact page, landing pages…).
          {filledUrls.length > 0 ? ` ${filledUrls.length} URL${filledUrls.length === 1 ? '' : 's'}.` : ''}
        </p>
      </div>
      {error && (
        <div className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-xs text-red-300 sm:col-span-2">
          {error}
        </div>
      )}
      <div className="flex items-center gap-2 sm:col-span-2">
        <button
          type="submit"
          disabled={saving || checking || name.trim().length === 0}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
        >
          {checking ? 'Checking…' : saving ? 'Saving…' : editing ? 'Save changes' : 'Add project'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
        >
          Cancel
        </button>
      </div>

      {/* Soft warning: duplicates and/or unreachable URLs — Okay / Add anyway. */}
      <ConfirmDialog
        open={warning !== null}
        variant="edit"
        title="Before you add these"
        cancelLabel="Okay"
        confirmLabel="Add anyway"
        message={
          <>
            {warning && warning.dups.length > 0 && (
              <>
                <p>Already in another project:</p>
                <ul className="mt-1.5 space-y-1">
                  {warning.dups.map((d) => (
                    <li key={d.url} className="text-[11px]">
                      <span className="break-all font-mono text-amber-200/80">{d.url}</span>
                      <span className="text-slate-400"> — in <strong className="text-slate-300">{d.projects.map((p) => p.name).join(', ')}</strong></span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {warning && warning.unreachable.length > 0 && (
              <>
                <p className={warning.dups.length > 0 ? 'mt-3' : ''}>Couldn&apos;t reach (may be down or blocking us):</p>
                <ul className="mt-1.5 space-y-1">
                  {warning.unreachable.map((u) => (
                    <li key={u} className="break-all font-mono text-[11px] text-amber-200/80">{u}</li>
                  ))}
                </ul>
              </>
            )}
            <p className="mt-2">
              A URL can belong to more than one project, and a live site can be briefly down. Add
              anyway, or go back and fix.
            </p>
          </>
        }
        onConfirm={() => {
          setWarning(null);
          proceed();
        }}
        onCancel={() => setWarning(null)}
      />

      <ConfirmDialog
        open={confirmEdit}
        variant="edit"
        title={`Remove ${removedUrls.length} URL${removedUrls.length === 1 ? '' : 's'} from this project?`}
        confirmLabel="Save changes"
        message={
          <>
            <p>These leave <strong className="text-slate-300">{name.trim()}</strong>:</p>
            <ul className="mt-1.5 space-y-0.5">
              {removedUrls.map((u) => (
                <li key={u} className="break-all font-mono text-[11px] text-amber-200/80">{u}</li>
              ))}
            </ul>
            <p className="mt-2">
              Nothing is deleted — their monitors keep running and results are kept. Any that have been
              tested or monitored move to <strong className="text-slate-300">Unassigned</strong> (on the
              Projects page) to reassign or dismiss; ones with no activity yet just drop off.
            </p>
            {filledUrls.length === 0 && (
              <p className="mt-2 rounded-md border border-amber-800/50 bg-amber-500/10 px-3 py-2 text-amber-200">
                This removes <strong>every URL</strong> — the now-empty project will be deleted (its
                URLs still keep their data).
              </p>
            )}
          </>
        }
        onConfirm={doSave}
        onCancel={() => setConfirmEdit(false)}
      />
    </form>
  );
}
