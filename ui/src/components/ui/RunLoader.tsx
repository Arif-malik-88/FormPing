'use client';
import { useEffect, useState } from 'react';

/**
 * Shared "we're working" loader shell (FR-76). The Form Tester and the Content
 * Changes monitor both showed the same ping-ring + headline + rotating "Did you
 * know?" card — this is the one source of truth for its look + size, so a change
 * here (type scale, height, spacing) lands everywhere the loader appears.
 *
 * Callers supply the glyph, copy, an optional `middle` slot (progress phases /
 * the multi-form narrative), the progress bar node, and the rotating facts.
 */
export function RunLoaderShell({
  glyph,
  headline,
  sub,
  middle,
  progress,
  facts,
}: {
  glyph: React.ReactNode;
  headline: string;
  sub: string;
  middle?: React.ReactNode;
  progress: React.ReactNode;
  facts: string[];
}) {
  const [factIdx, setFactIdx] = useState(0);
  useEffect(() => {
    if (facts.length <= 1) return;
    const t = setInterval(() => setFactIdx((i) => (i + 1) % facts.length), 8000);
    return () => clearInterval(t);
  }, [facts.length]);

  return (
    <div className="fp-rise overflow-hidden rounded-xl border border-line bg-panel p-6 sm:p-7">
      <div className="flex items-start gap-4">
        {/* Animated ping rings — on-brand (form + ping). Top-aligned with the heading. */}
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
          <span className="absolute inline-flex h-11 w-11 animate-ping rounded-full bg-accent/15 [animation-duration:2s] motion-reduce:animate-none" aria-hidden />
          <span className="absolute h-14 w-14 rounded-full border border-accent/15" aria-hidden />
          <span className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-panel-raised text-accent-soft ring-1 ring-line-strong">
            {glyph}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-lg font-semibold text-ink">{headline}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{sub}</p>
          {middle}
        </div>

        {/* Cat running rightward ALONG the dashed path: the path is the ground and
            the cat's feet sit ON it. Fills the space right of the copy, up here at
            the header level so it never reads as a second progress bar. Hidden on
            small screens, frozen for reduced motion. FR-76. */}
        <div className="relative hidden h-12 flex-1 self-center sm:block" aria-hidden>
          {/* Static dashed path (plain CSS gradient — no keyframes, always renders). */}
          <div
            className="absolute bottom-[3px] right-0 h-[3px] w-56 max-w-full rounded-full text-accent-soft/45"
            style={{ backgroundImage: 'repeating-linear-gradient(to right, currentColor 0 6px, transparent 6px 12px)', backgroundSize: '12px 100%' }}
          />
          {/* Cat running rightward, feet on the path. GIF faces left by default;
              scaleX(-1) mirrors it to run right; invert → white. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- animated GIF: next/image would freeze it */}
          <img
            src="/running-cat.gif"
            alt=""
            className="absolute bottom-0 right-[25%] h-12 w-auto select-none invert"
            style={{ transform: 'scaleX(-1)' }}
            draggable={false}
          />
        </div>
      </div>
      <div className="mt-5">{progress}</div>
      <div className="mt-5 flex items-start gap-2.5 border-t border-line pt-4">
        <svg viewBox="0 0 24 24" fill="none" className="mt-0.5 h-4 w-4 shrink-0 text-accent-soft" aria-hidden>
          <path d="M9 18h6M10 21h4M12 3a6 6 0 00-4 10.5c.6.6 1 1.2 1 2h6c0-.8.4-1.4 1-2A6 6 0 0012 3z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p key={factIdx} className="fp-rise text-sm leading-relaxed text-ink-muted">
          <span className="font-semibold text-ink-secondary">Did you know?</span> {facts[factIdx]}
        </p>
      </div>
    </div>
  );
}
