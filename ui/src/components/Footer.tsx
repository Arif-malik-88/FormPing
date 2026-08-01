'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BugReportModal } from './BugReportModal';

/**
 * App-wide footer.
 *
 * Path-aware: on internal app pages it carries Docs (moved out of the header,
 * FR-26) and a "Report a bug" form. On the login screen and the PUBLIC client
 * status pages it stays minimal — those are unauthenticated / client-facing.
 */
export function Footer() {
  const pathname = usePathname();
  const [bugOpen, setBugOpen] = useState(false);
  // The public landing page (FR-29) and docs knowledge center (FR-33) carry
  // their own footer — suppress the app one there.
  if (pathname === '/welcome' || pathname === '/docs') return null;
  const isPublic = pathname === '/login' || pathname.startsWith('/status/');

  return (
    <footer className="mt-8 border-t border-slate-800/80 bg-slate-950">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between sm:gap-6">
        {/* Brand / identity */}
        <div className="text-center sm:text-left">
          <p className="text-sm font-semibold text-slate-200">FormPing</p>
          <p className="mt-1 text-xs text-slate-500">
            Contact-form QA &amp; site monitoring — an <span className="text-slate-400">Apexure</span> internal tool.
          </p>
        </div>

        {/* Links (internal pages only) */}
        {!isPublic && (
          <nav className="flex items-center gap-2 text-sm">
            <Link
              href="/docs"
              className="rounded-lg px-3 py-1.5 font-medium text-slate-400 transition-colors hover:bg-slate-900 hover:text-slate-100"
            >
              Docs
            </Link>
            <span className="text-slate-700" aria-hidden>·</span>
            <button
              type="button"
              onClick={() => setBugOpen(true)}
              className="rounded-lg px-3 py-1.5 font-medium text-slate-400 transition-colors hover:bg-slate-900 hover:text-slate-100"
            >
              Report a bug
            </button>
          </nav>
        )}

        <p className="text-xs text-slate-600">&copy; 2026 Apexure. All rights reserved.</p>
      </div>

      {!isPublic && <BugReportModal open={bugOpen} onClose={() => setBugOpen(false)} />}
    </footer>
  );
}
