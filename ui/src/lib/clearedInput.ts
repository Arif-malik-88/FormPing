/**
 * Remembers, for the browser session, that the user explicitly cleared a tab's
 * URL input — so NOTHING silently refills it (FR-23).
 *
 * "Clear" must mean the box stays empty until the user types again. But two
 * sources repopulate an empty input on mount: the localStorage restore, and (on
 * Change tracking) an auto-fill from any running watch. Because remounting a tab
 * resets component state, a plain ref can't carry the intent across a
 * tab-switch — so the "cleared" fact lives in sessionStorage, which survives
 * remount and refresh but not a new session.
 *
 * The marker is set on Clear and removed the moment the user types, so the
 * suppression lasts exactly as long as the deliberate-empty state does.
 */

const key = (tab: string) => `fp:cleared:${tab}`;

/** Record that the user cleared this tab's input. */
export function markCleared(tab: string): void {
  try {
    sessionStorage.setItem(key(tab), '1');
  } catch {
    /* sessionStorage unavailable (private mode) — best-effort */
  }
}

/** The user has re-engaged (typed) — auto-fill is welcome again. */
export function unmarkCleared(tab: string): void {
  try {
    sessionStorage.removeItem(key(tab));
  } catch {
    /* ignore */
  }
}

/** True while a deliberate clear is in effect — auto-fill must stay out. */
export function wasCleared(tab: string): boolean {
  try {
    return sessionStorage.getItem(key(tab)) === '1';
  } catch {
    return false;
  }
}
