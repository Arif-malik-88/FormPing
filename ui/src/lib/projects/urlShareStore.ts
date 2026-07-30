/**
 * Per-URL public share tokens (FR-27). Server-only.
 *
 * Mirrors the project-level share (projectStore.enableShare/disableShare/
 * findByToken) but for a SINGLE URL inside a project, keyed by the canonical
 * `matchKey` (url_key). One active token per (project, url). Backed by the
 * `url_shares` table; the FK `on delete cascade` drops rows when the project is
 * deleted, and `removeForUrl` drops one when a URL leaves a project.
 */
import { supabaseAdmin } from '@/lib/supabase';
import { matchKey } from './projectStore';

function newToken(): string {
  return (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, '');
}

export interface UrlShareRef {
  projectId: string;
  urlKey: string;
}

/** The current token for a URL in a project, or null if not shared. */
export async function getUrlShareToken(projectId: string, url: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin()
    .from('url_shares')
    .select('token')
    .eq('project_id', projectId)
    .eq('url_key', matchKey(url))
    .maybeSingle();
  if (error) {
    console.warn(`[urlShareStore] getUrlShareToken: ${error.message}`);
    return null;
  }
  return (data as { token: string } | null)?.token ?? null;
}

/** Generate (or regenerate) the share token for a URL. Returns the new token. */
export async function enableUrlShare(projectId: string, url: string): Promise<string | null> {
  const token = newToken();
  const { error } = await supabaseAdmin()
    .from('url_shares')
    .upsert({ token, project_id: projectId, url_key: matchKey(url) }, { onConflict: 'project_id,url_key' });
  if (error) {
    console.warn(`[urlShareStore] enableUrlShare: ${error.message}`);
    return null;
  }
  return token;
}

/** Revoke the share for a URL (public link goes 404 immediately). */
export async function disableUrlShare(projectId: string, url: string): Promise<void> {
  const { error } = await supabaseAdmin()
    .from('url_shares')
    .delete()
    .eq('project_id', projectId)
    .eq('url_key', matchKey(url));
  if (error) console.warn(`[urlShareStore] disableUrlShare: ${error.message}`);
}

/** Resolve a public token → which project + url_key it points at, or null. */
export async function findUrlShareByToken(token: string): Promise<UrlShareRef | null> {
  const { data, error } = await supabaseAdmin()
    .from('url_shares')
    .select('project_id, url_key')
    .eq('token', token)
    .maybeSingle();
  if (error) {
    console.warn(`[urlShareStore] findUrlShareByToken: ${error.message}`);
    return null;
  }
  if (!data) return null;
  const r = data as { project_id: string; url_key: string };
  return { projectId: r.project_id, urlKey: r.url_key };
}

/**
 * Revoke any share for a URL leaving a project (called from the edit/remove
 * paths). Takes the raw url_key so it can run even after the URL is gone from
 * the project's list. Best-effort.
 */
export async function removeUrlShareByKey(projectId: string, urlKey: string): Promise<void> {
  const { error } = await supabaseAdmin()
    .from('url_shares')
    .delete()
    .eq('project_id', projectId)
    .eq('url_key', urlKey);
  if (error) console.warn(`[urlShareStore] removeUrlShareByKey: ${error.message}`);
}
