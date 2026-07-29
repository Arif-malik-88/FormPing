'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useMe, canRole } from '@/lib/auth/useMe';
import { ROLE_LABEL } from '@/lib/auth/roles';

interface SubTab {
  href: string;
  label: string;
  /** One-line description of what this sub-tab does (shown under the sub-nav). */
  hint?: string;
}
interface NavGroup {
  label: string;
  /** Where the top-level tab links to (the group's primary page). */
  href: string;
  /** Pathnames that belong to this group (drives active state). */
  match: string[];
  subTabs: SubTab[];
  /** Shown in the sub-nav row for areas with no sub-tabs, so the header keeps a
   *  constant height (prevents the page shifting when navigating to/from Docs). */
  hint?: string;
}

// Two subject-based areas + Docs. The on-demand and scheduled views of the
// same subject live together so the app reads as "the client's form" vs
// "the client's site" rather than five unrelated tabs.
const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Projects',
    href: '/projects',
    match: ['/projects'],
    subTabs: [],
    hint: 'Clients and all their monitors in one place',
  },
  {
    label: 'Contact Forms',
    href: '/',
    match: ['/', '/form-watch'],
    subTabs: [
      { href: '/', label: 'Form Tester', hint: 'Run an instant contact-form check on any URL' },
      { href: '/form-watch', label: 'Form Scheduler', hint: 'Auto-re-test forms on a schedule and alert on failures' },
    ],
  },
  {
    label: 'Site Health',
    href: '/site-watch',
    match: ['/site-watch', '/monitor'],
    subTabs: [
      { href: '/site-watch', label: 'Uptime & SSL', hint: 'Track availability, SSL and domain expiry on a schedule' },
      { href: '/monitor', label: 'Content Changes', hint: 'Snapshot pages and get alerted when content changes' },
    ],
  },
];
// Docs moved to the footer (FR-26) — the header is tools-only.

// The Team (user management) tab — only shown to Admin+ (see below). Kept out of
// NAV_GROUPS so it never appears for members/viewers.
export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const me = useMe();

  // Open on hover (desktop) with a short close delay so the pointer can cross the
  // gap to the menu without it snapping shut. Click still toggles (touch/keyboard).
  const openMenu = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setMenuOpen(true);
  };
  const closeMenuSoon = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setMenuOpen(false), 160);
  };

  // Team & access is NOT a top-level tab — it lives in the profile menu (below),
  // reached by admins/owner. The header stays tools-only.
  const navGroups = NAV_GROUPS;
  const activeGroup = navGroups.find((g) => g.match.includes(pathname));
  const profile = me.email ? { user: me.email, name: me.name, picture: me.picture } : null;
  const isAdmin = canRole(me.role, 'admin');

  // Close the user menu on outside-click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await fetch('/api/auth/logout', { method: 'POST' });
    startTransition(() => {
      router.push('/login');
      router.refresh();
    });
  };

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 sm:gap-6">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          {/* Brand mark — Form + Ping (same artwork as the favicon) */}
          <div className="rounded-lg shadow-lg shadow-indigo-900/50">
            <svg width="34" height="34" viewBox="0 0 64 64" aria-hidden className="block">
              <defs>
                <linearGradient id="fpHeaderMark" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#6366f1" />
                  <stop offset="1" stopColor="#4338ca" />
                </linearGradient>
              </defs>
              <rect width="64" height="64" rx="14" fill="url(#fpHeaderMark)" />
              <rect x="14" y="12" width="27" height="29" rx="5" fill="#ffffff" />
              <rect x="19" y="18.4" width="17" height="3.2" rx="1.6" fill="#c7d2fe" />
              <rect x="19" y="24.4" width="17" height="3.2" rx="1.6" fill="#c7d2fe" />
              <rect x="19" y="30.4" width="11" height="3.2" rx="1.6" fill="#c7d2fe" />
              <circle cx="45" cy="46" r="8" fill="none" stroke="#ff6a2b" strokeWidth="2.4" opacity="0.5" />
              <circle cx="45" cy="46" r="4.2" fill="#ff6a2b" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 leading-none">FormPing</h1>
            <p className="hidden sm:block text-xs text-slate-500 mt-0.5">Contact Form QA & Site Monitor</p>
          </div>
        </div>

        {/* Top-level nav — a segmented control grouped by subject (Forms / Site / Docs).
            On mobile it drops to its own full-width row below the brand/sign-out, with
            the pills sharing the width evenly. */}
        <nav className="order-last w-full sm:order-none sm:w-auto flex items-center gap-1 bg-slate-900/70 rounded-xl p-1 ring-1 ring-slate-800 shadow-inner shadow-black/20">
          {navGroups.map((group) => {
            const active = group.match.includes(pathname);
            return (
              <Link
                key={group.href}
                href={group.href}
                className={`flex-1 sm:flex-initial text-center px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  active
                    ? 'bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-900/50 ring-1 ring-indigo-400/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                }`}
              >
                {group.label}
              </Link>
            );
          })}
        </nav>

        {profile && (
          <div className="relative" ref={menuRef} onMouseEnter={openMenu} onMouseLeave={closeMenuSoon}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              title="Account, team & sign out"
              className={`inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 ring-1 transition-colors ${
                menuOpen ? 'bg-slate-800 ring-slate-600' : 'bg-slate-800/60 ring-slate-700 hover:bg-slate-800 hover:ring-slate-600'
              }`}
            >
              {profile.picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.picture} alt="" referrerPolicy="no-referrer" className="h-6 w-6 rounded-full object-cover" />
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-semibold text-white">
                  {(profile.name || profile.user).charAt(0).toUpperCase()}
                </span>
              )}
              <span className="hidden max-w-[120px] truncate text-xs font-medium text-slate-200 sm:inline">
                {profile.name || profile.user}
              </span>
              {/* Role pill — always visible so members/viewers see their access at a glance. */}
              {me.role && (
                <span className="hidden rounded-full bg-indigo-500/15 px-1.5 py-[3px] text-[9px] font-bold uppercase leading-none tracking-wide text-indigo-300 ring-1 ring-indigo-500/25 sm:inline">
                  {ROLE_LABEL[me.role]}
                </span>
              )}
              <span className={`flex h-5 w-5 items-center justify-center rounded-full transition-colors ${menuOpen ? 'bg-indigo-500/25 text-indigo-200' : 'bg-slate-700/60 text-slate-300'}`}>
                <svg viewBox="0 0 20 20" fill="currentColor" className={`h-3.5 w-3.5 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} aria-hidden>
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </span>
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="fp-menu-in absolute right-0 z-30 mt-2.5 w-64 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/50"
              >
                {/* Caret pointing up to the avatar chip. */}
                <span className="absolute -top-1.5 right-5 h-3 w-3 rotate-45 rounded-[2px] border-l border-t border-slate-700 bg-slate-900" aria-hidden />
                <div className="relative border-b border-slate-800 px-4 py-3.5">
                  <p className="truncate text-sm font-semibold text-slate-100">{profile.name || 'Signed in'}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{profile.user}</p>
                  {me.role && (
                    <span className="mt-2 inline-flex items-center rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-300 ring-1 ring-indigo-500/25">
                      {ROLE_LABEL[me.role]}
                    </span>
                  )}
                </div>
                <div className="overflow-hidden rounded-b-xl py-1">
                  {isAdmin && (
                    <Link
                      href="/team"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
                      role="menuitem"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-slate-500" aria-hidden><path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6 8a2 2 0 11-4 0 2 2 0 014 0zM1.49 15.326a.78.78 0 01-.358-.442 3 3 0 014.308-3.516 6.484 6.484 0 00-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 01-2.07-.655zM16.44 15.98a4.97 4.97 0 002.07-.654.78.78 0 00.357-.442 3 3 0 00-4.308-3.517 6.484 6.484 0 011.907 3.96 2.32 2.32 0 01-.026.654zM18 8a2 2 0 11-4 0 2 2 0 014 0zM5.304 16.19a.844.844 0 01-.277-.71 5 5 0 019.947 0 .843.843 0 01-.277.71A6.975 6.975 0 0110 18a6.974 6.974 0 01-4.696-1.81z" /></svg>
                      Team &amp; access
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={pending}
                    role="menuitem"
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-slate-500" aria-hidden><path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd" /><path fillRule="evenodd" d="M19 10a.75.75 0 00-.22-.53l-3.25-3.25a.75.75 0 00-1.06 1.06L16.94 9.5H9.75a.75.75 0 000 1.5h7.19l-2.47 2.47a.75.75 0 101.06 1.06l3.25-3.25c.141-.141.22-.331.22-.53z" clipRule="evenodd" /></svg>
                    {pending ? 'Signing out…' : 'Sign out'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sub-nav — ALWAYS rendered so the header height stays constant. This stops
          the page shifting when navigating to/from an area without sub-tabs (Docs).
          Areas with sub-tabs show underline tabs (the indicator scales in on the
          active one); others show a muted hint. Keyed on the area so the row fades
          in on an area switch (mobile only). */}
      <div className="border-t border-slate-800/60">
        <div
          key={activeGroup?.label ?? 'none'}
          className="fp-subnav-in max-w-7xl mx-auto px-4 flex items-stretch gap-1 sm:gap-2 h-11 overflow-x-auto"
        >
          {activeGroup && activeGroup.subTabs.length > 0 ? (
            <>
              {activeGroup.subTabs.map((sub) => {
                const subActive = pathname === sub.href;
                return (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    title={sub.hint}
                    className={`group relative flex-1 sm:flex-initial inline-flex items-center justify-center px-3 text-xs font-medium whitespace-nowrap transition-colors duration-200 ${
                      subActive ? 'text-indigo-300' : 'text-slate-500 hover:text-slate-200'
                    }`}
                  >
                    {sub.label}
                    <span
                      className={`pointer-events-none absolute inset-x-2 bottom-0 h-[2px] rounded-full origin-center transition-transform duration-300 ease-out ${
                        subActive
                          ? 'bg-indigo-400 scale-x-100'
                          : 'bg-slate-600 scale-x-0 group-hover:scale-x-50'
                      }`}
                    />
                  </Link>
                );
              })}
              {/* Active sub-tab's one-line description — clarity for the current view. */}
              {activeGroup.subTabs.find((s) => s.href === pathname)?.hint && (
                <span className="ml-auto hidden items-center text-xs font-medium text-slate-600 lg:inline-flex">
                  {activeGroup.subTabs.find((s) => s.href === pathname)?.hint}
                </span>
              )}
            </>
          ) : (
            <span className="inline-flex items-center text-xs font-medium text-slate-600">
              {activeGroup?.hint ?? ''}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
