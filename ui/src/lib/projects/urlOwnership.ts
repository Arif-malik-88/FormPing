import { projectStore, matchKey } from './projectStore';

/**
 * "One page = one client." A given page URL belongs to at most ONE project, so a
 * URL already in a project can't be added to a second one (its monitor is global
 * per-URL — two projects claiming it would be ambiguous, and would make deletes
 * unsafe). Matching is on the canonical `matchKey` (scheme-agnostic; strips www,
 * trailing slash, query and fragment), so trivial variants of the SAME page count
 * as the same URL. Matches on the full URL, never the domain — many pages share a
 * domain and that stays allowed.
 */

export interface UrlOwner {
  id: string;
  name: string;
}

/** The project (other than `exceptProjectId`) that already contains `url`, or null. */
export async function projectOwningUrl(url: string, exceptProjectId?: string): Promise<UrlOwner | null> {
  const key = matchKey(url);
  const projects = await projectStore.list();
  const owner = projects.find((p) => p.id !== exceptProjectId && p.urls.some((u) => matchKey(u) === key));
  return owner ? { id: owner.id, name: owner.name } : null;
}

/**
 * The first URL in `urls` already owned by a project other than `exceptProjectId`,
 * with its owner — or null if none clash. One store read for the whole batch.
 */
export async function firstUrlOwnedElsewhere(
  urls: string[],
  exceptProjectId?: string,
): Promise<{ url: string; owner: UrlOwner } | null> {
  const others = (await projectStore.list()).filter((p) => p.id !== exceptProjectId);
  for (const url of urls) {
    const key = matchKey(url);
    const owner = others.find((p) => p.urls.some((u) => matchKey(u) === key));
    if (owner) return { url, owner: { id: owner.id, name: owner.name } };
  }
  return null;
}

/** The first URL that appears more than once (same canonical page) in `urls`, or
 *  null. The same page can't be listed twice in a project — surfaced as an error
 *  rather than silently de-duplicated. */
export function firstDuplicatePage(urls: string[]): string | null {
  const seen = new Set<string>();
  for (const u of urls) {
    const key = matchKey(u);
    if (seen.has(key)) return u;
    seen.add(key);
  }
  return null;
}
