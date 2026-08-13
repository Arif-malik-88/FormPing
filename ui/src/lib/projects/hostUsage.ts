import { projectStore } from './projectStore';
import { siteKey } from '@/lib/watchRegistry';

/**
 * Cross-project host references.
 *
 * Change-tracking data (reports, events, snapshots) and a running change-watch
 * are keyed per HOSTNAME, not per URL — a whole site is crawled from its
 * homepage. So when a URL or a project is deleted, that host's data must only be
 * purged once NOTHING references the host anymore. Each delete route already
 * checks other URLs in the SAME project; these cover every OTHER project, so we
 * never wipe a host's history out from under a project that still tracks it.
 */

/** Every hostname referenced by projects OTHER than `exceptProjectId`. */
export async function hostsUsedByOtherProjects(exceptProjectId: string): Promise<Set<string>> {
  const projects = await projectStore.list();
  const hosts = new Set<string>();
  for (const p of projects) {
    if (p.id === exceptProjectId) continue;
    for (const url of p.urls) {
      const h = siteKey(url);
      if (h && h !== 'unknown') hosts.add(h);
    }
  }
  return hosts;
}

/** Whether any project other than `exceptProjectId` still references `host`. */
export async function hostUsedByOtherProject(host: string, exceptProjectId: string): Promise<boolean> {
  if (!host || host === 'unknown') return false;
  return (await hostsUsedByOtherProjects(exceptProjectId)).has(host);
}
