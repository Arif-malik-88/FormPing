/**
 * Tiny toast store — module-level, framework-agnostic (same pattern as the run
 * stores). `showToast(msg)` shows a small self-closing notice; the <Toaster/> in
 * the layout renders them. Used for the "where did it go?" reassurance messages
 * on Clear / Stop / Delete (FR-26), so users know their data is still in Projects.
 */
export interface Toast {
  id: number;
  message: string;
}

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const EMPTY: Toast[] = [];

function emit() {
  listeners.forEach((l) => l());
}

/** Show a toast that auto-dismisses after `ms`. Client-only. */
export function showToast(message: string, ms = 5200): void {
  const id = nextId++;
  toasts = [...toasts, { id, message }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, ms);
}

export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
export function getSnapshot(): Toast[] {
  return toasts;
}
export function getServerSnapshot(): Toast[] {
  return EMPTY;
}
