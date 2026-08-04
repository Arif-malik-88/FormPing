'use client';

import { useId } from 'react';

/**
 * FormPing brand mark (FR-36) — the Form + Ping glyph, extracted so it lives in
 * ONE place instead of being copy-pasted into every chrome (the colour audit
 * flagged it duplicated across Header/login/welcome/docs). The orange ping is the
 * only place the brand orange appears — logo only, never a UI colour.
 */
export function BrandMark({ size = 34, className }: { size?: number; className?: string }) {
  // Unique gradient id per instance so two marks on one page (e.g. desktop rail +
  // mobile drawer) never collide.
  const gid = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className={className}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#4338ca" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill={`url(#${gid})`} />
      <rect x="14" y="12" width="27" height="29" rx="5" fill="#ffffff" />
      <rect x="19" y="18.4" width="17" height="3.2" rx="1.6" fill="#c7d2fe" />
      <rect x="19" y="24.4" width="17" height="3.2" rx="1.6" fill="#c7d2fe" />
      <rect x="19" y="30.4" width="11" height="3.2" rx="1.6" fill="#c7d2fe" />
      <circle cx="45" cy="46" r="8" fill="none" stroke="#ff6a2b" strokeWidth="2.4" opacity="0.5" />
      <circle cx="45" cy="46" r="4.2" fill="#ff6a2b" />
    </svg>
  );
}
