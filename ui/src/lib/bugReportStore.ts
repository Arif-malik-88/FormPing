import { supabaseAdmin } from '@/lib/supabase';

/**
 * Server-only store for bug reports (FR-26 form + FR-31 admin inbox).
 *
 * The footer "Report a bug" form inserts a row; the admin inbox lists them and
 * lets an admin resolve / reopen / delete. Uses the privileged Supabase client,
 * so it must only ever run server-side (API routes).
 */

export type BugStatus = 'open' | 'resolved';

export interface BugReport {
  id: string;
  name: string | null;
  email: string | null;
  message: string;
  page: string | null;
  reporter: string | null;
  status: BugStatus;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface NewBugReport {
  name: string | null;
  email: string | null;
  message: string;
  page: string | null;
  reporter: string | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function toReport(r: any): BugReport {
  return {
    id: r.id,
    name: r.name ?? null,
    email: r.email ?? null,
    message: r.message ?? '',
    page: r.page ?? null,
    reporter: r.reporter ?? null,
    status: r.status === 'resolved' ? 'resolved' : 'open',
    resolvedBy: r.resolved_by ?? null,
    resolvedAt: r.resolved_at ?? null,
    createdAt: r.created_at,
  };
}

/** Store a submitted report (used by the public POST). */
export async function insertBugReport(r: NewBugReport): Promise<void> {
  const { error } = await supabaseAdmin().from('bug_reports').insert(r);
  if (error) throw error;
}

/** All reports, newest first (admin inbox). Capped generously. */
export async function listBugReports(): Promise<BugReport[]> {
  const { data, error } = await supabaseAdmin()
    .from('bug_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []).map(toReport);
}

/**
 * Resolve or reopen a report. Resolving stamps who + when; reopening clears them.
 * Returns false when no row matched the id.
 */
export async function setBugReportStatus(id: string, status: BugStatus, resolvedBy: string | null): Promise<boolean> {
  const patch =
    status === 'resolved'
      ? { status, resolved_by: resolvedBy, resolved_at: new Date().toISOString() }
      : { status, resolved_by: null, resolved_at: null };
  const { data, error } = await supabaseAdmin().from('bug_reports').update(patch).eq('id', id).select('id');
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

/** Hard-delete a report (these are disposable, unlike monitoring data). */
export async function deleteBugReport(id: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin().from('bug_reports').delete().eq('id', id).select('id');
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}
