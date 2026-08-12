import { PageHeader } from '@/components/ui';
import { RELEASES } from '@/lib/releases';

/**
 * "What's new" — the in-app release notes (FR-45). Signed-in only (a normal
 * internal route inside the app shell). Reads the curated list in lib/releases.
 */
export const metadata = { title: 'What’s new · FormPing' };

export default function WhatsNewPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 pb-20 pt-8">
      <PageHeader title="What’s new" description="The latest updates and improvements to FormPing." />

      <div className="mt-8 space-y-6">
        {RELEASES.map((r, idx) => (
          <article key={r.version} className="overflow-hidden rounded-2xl border border-line bg-panel/50 shadow-sm shadow-black/20">
            {/* Header band — version, badges, date */}
            <div className="flex flex-wrap items-center gap-2.5 border-b border-line bg-panel/40 px-5 py-4 sm:px-6">
              <span className="rounded-full bg-gradient-to-b from-accent to-accent-strong px-2.5 py-1 text-xs font-bold text-white ring-1 ring-accent-soft/20">
                v{r.version}
              </span>
              {idx === 0 && (
                <span className="rounded-full bg-ok/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ok ring-1 ring-ok/25">
                  Latest
                </span>
              )}
              {r.major && (
                <span className="rounded-full bg-accent/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-soft ring-1 ring-accent/25">
                  Major update
                </span>
              )}
              <span className="ml-auto text-xs font-medium text-ink-faint">{r.date}</span>
            </div>

            {/* Body — name, summary, detailed changes */}
            <div className="px-5 py-5 sm:px-6">
              <h2 className="text-xl font-bold tracking-tight text-ink">{r.name}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{r.summary}</p>

              <ul className="mt-5 space-y-5 border-t border-line pt-5">
                {r.changes.map((c, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/12 ring-1 ring-accent/20" aria-hidden>
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3 text-accent">
                        <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0l-3.5-3.5a1 1 0 011.4-1.4l2.8 2.8 6.8-6.8a1 1 0 011.4 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">{c.title}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">{c.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-ink-faint">More improvements are always on the way.</p>
    </main>
  );
}
