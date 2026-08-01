'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useMe } from '@/lib/auth/useMe';

/**
 * Public documentation / knowledge center (FR-33).
 *
 * Reachable WITHOUT login (allow-listed in middleware) so anyone evaluating
 * FormPing can read it. It is PRODUCT documentation only — deliberately carries
 * no infrastructure, storage, env, or account/ops detail. Self-contained chrome
 * (its own header + footer); the app header/footer are suppressed on /docs.
 *
 * Layout: a grouped, sticky sidebar with scroll-spy highlighting + a readable
 * content column. Tailwind only (no styled-jsx) so styles are server-rendered.
 */

interface NavItem { id: string; label: string; }
interface NavGroup { group: string; items: NavItem[]; }

const NAV: NavGroup[] = [
  { group: 'Introduction', items: [
    { id: 'what', label: 'What is FormPing' },
    { id: 'why', label: 'Why use it' },
    { id: 'organized', label: 'How it’s organized' },
  ] },
  { group: 'Contact Forms', items: [
    { id: 'form-tester', label: 'Form Tester' },
    { id: 'form-scheduler', label: 'Form Scheduler' },
  ] },
  { group: 'Site Health', items: [
    { id: 'uptime-ssl', label: 'Uptime & SSL' },
    { id: 'content-changes', label: 'Content Changes' },
  ] },
  { group: 'Projects', items: [
    { id: 'projects', label: 'Projects & Unassigned' },
    { id: 'status-pages', label: 'Client status pages' },
  ] },
  { group: 'Team', items: [
    { id: 'access-roles', label: 'Access & roles' },
    { id: 'alerts', label: 'Alerts' },
  ] },
  { group: 'Help', items: [
    { id: 'faq', label: 'FAQ' },
  ] },
];

const ALL_IDS = NAV.flatMap((g) => g.items.map((i) => i.id));

export default function DocsContent() {
  const me = useMe();
  const [active, setActive] = useState<string>('what');
  const [menuOpen, setMenuOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const signedIn = Boolean(me.email);

  // Scroll-spy: highlight the section currently nearest the top of the viewport.
  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    const els = ALL_IDS.map((id) => root.querySelector<HTMLElement>(`#${id}`)).filter(Boolean) as HTMLElement[];
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-96px 0px -68% 0px', threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* ── Self-contained header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/85 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
          <Link href="/welcome" className="flex items-center gap-2.5" aria-label="FormPing home">
            <BrandMark />
            <span className="flex items-baseline gap-2">
              <span className="text-base font-bold text-slate-100">FormPing</span>
              <span className="hidden text-xs font-medium text-slate-500 sm:inline">Docs</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="rounded-lg border border-slate-700 p-2 text-slate-300 lg:hidden"
              aria-label="Toggle contents"
              aria-expanded={menuOpen}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            </button>
            {signedIn ? (
              <Link href="/" className="rounded-lg bg-gradient-to-b from-indigo-500 to-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow ring-1 ring-indigo-400/30 hover:from-indigo-400 hover:to-indigo-500">
                Open app →
              </Link>
            ) : (
              <Link href="/login" className="rounded-lg bg-gradient-to-b from-indigo-500 to-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow ring-1 ring-indigo-400/30 hover:from-indigo-400 hover:to-indigo-500">
                Sign in →
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:pt-10">
        <div className="lg:grid lg:grid-cols-12 lg:gap-10">
          {/* ── Sidebar nav (grouped + scroll-spy) ──────────────────────── */}
          <aside className={`${menuOpen ? 'block' : 'hidden'} lg:block lg:col-span-3`}>
            <nav className="lg:sticky lg:top-24 mb-8 rounded-xl border border-slate-800 bg-slate-900/40 p-3 lg:mb-0">
              {NAV.map((grp) => (
                <div key={grp.group} className="mb-3 last:mb-0">
                  <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{grp.group}</p>
                  <ul className="space-y-0.5">
                    {grp.items.map((it) => {
                      const on = active === it.id;
                      return (
                        <li key={it.id}>
                          <a
                            href={`#${it.id}`}
                            onClick={() => setMenuOpen(false)}
                            aria-current={on ? 'true' : undefined}
                            className={`block rounded-md px-2 py-1.5 text-sm transition-colors ${
                              on ? 'bg-indigo-500/12 font-medium text-indigo-300 ring-1 ring-indigo-500/25' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                            }`}
                          >
                            {it.label}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </aside>

          {/* ── Content ─────────────────────────────────────────────────── */}
          <div ref={contentRef} className="lg:col-span-9">
            <div className="max-w-3xl">
              {/* Hero */}
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-300">FormPing Docs</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">Know your clients’ sites are working — and prove it.</h1>
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-400">
                A practical guide to what FormPing does, why it’s useful, and how to use every part of it — contact-form testing, uptime &amp; SSL, content-change monitoring, projects, and shareable client status pages.
              </p>

              {/* ══ Introduction ══ */}
              <Section id="what" title="What is FormPing">
                <P>FormPing is a monitoring tool for agencies. It continuously checks that your clients’ websites are actually working — their <strong className="text-slate-200">contact forms submit</strong>, their <strong className="text-slate-200">sites stay up</strong>, their <strong className="text-slate-200">SSL certificates are valid</strong>, and their <strong className="text-slate-200">pages haven’t silently changed</strong> — and it pings you the moment something breaks.</P>
                <P>Everything lives in one place: a dashboard per client, and a clean status page you can hand to the client. You run it in the browser — nothing to install.</P>
              </Section>

              <Section id="why" title="Why use it">
                <P>When a client’s contact form quietly breaks or their site goes down, <strong className="text-slate-200">leads stop arriving and no one notices</strong> — until the client asks why business went quiet. FormPing closes that gap:</P>
                <UL>
                  <LI><strong className="text-slate-200">Catch problems first.</strong> You hear about a broken form or an expiring certificate before the client does — so you look proactive, not caught out.</LI>
                  <LI><strong className="text-slate-200">No lead falls through.</strong> Scheduled checks submit a real test entry, so you know the form actually delivers to the inbox — not just that it looks fine.</LI>
                  <LI><strong className="text-slate-200">One board for every client.</strong> Forms, uptime, SSL, domain expiry, and content changes across all clients in one view.</LI>
                  <LI><strong className="text-slate-200">Show your work.</strong> A live, login-free status page per client makes the monitoring visible and builds trust.</LI>
                </UL>
              </Section>

              <Section id="organized" title="How it’s organized">
                <P>FormPing is built around <strong className="text-slate-200">Projects</strong> (a client plus their URLs), and two tool areas:</P>
                <Table
                  headers={['Area', 'What it answers']}
                  rows={[
                    [<b key="0">Projects</b>, 'Group a client’s URLs; see their form, uptime, and SSL health together — and share a status page.'],
                    [<b key="0">Contact Forms</b>, 'Is the client’s contact form working? On-demand (Form Tester) and scheduled (Form Scheduler).'],
                    [<b key="0">Site Health</b>, 'Is the client’s site up, secure, and unchanged? Uptime & SSL, plus Content Changes.'],
                  ]}
                />
                <Note>Any URL you test or monitor automatically appears in Projects — under its client, or in an <strong>Unassigned</strong> bucket if you haven’t grouped it yet. Nothing you’ve touched is ever invisible.</Note>
              </Section>

              {/* ══ Contact Forms ══ */}
              <Section id="form-tester" title="Form Tester" eyebrow="Contact Forms">
                <P>Run an <strong className="text-slate-200">instant check</strong> on any URL: FormPing finds the contact page, locates the form, fills it with test data, optionally submits it, and confirms the success (thank-you) state.</P>
                <Table
                  headers={['Mode', 'What it does']}
                  rows={[
                    [<Code key="0">Safe</Code>, 'Fills the form but does NOT submit. The default.'],
                    [<Code key="0">Live</Code>, 'Actually submits — confirms the form delivers. Use only on sites you’re authorized to test.'],
                    [<Code key="0">Detect-only</Code>, 'Just confirms a form is present. No fill, no submit.'],
                  ]}
                />
                <P>Each result is a clear verdict — <strong className="text-slate-200">healthy</strong>, <strong className="text-slate-200">needs attention</strong>, or <strong className="text-slate-200">failing</strong> — with a plain-English reason. CAPTCHA and anti-bot protection are detected and reported, never bypassed.</P>
                <Note>
                  <strong>Landing-page mode.</strong> By default the tester crawls the site to discover a separate contact page. Turn on <strong>Landing page</strong> when the form is on the exact URL you gave (a standalone landing page with no separate contact page) — it tests that URL directly, and is lenient enough to accept a quiz, assessment, or booking form, not just a classic contact form.
                </Note>
                <Note>
                  <strong>It tells you <em>why</em>, not just “not found”.</strong> When no contact form is submitted you get one of three clear outcomes: <strong>No form on the page</strong>, <strong>Found a form — but not a contact form</strong> (with the score and which fields are missing), or <strong>Third-party embed found</strong> — a hosted Typeform, HubSpot, Calendly, Jotform, Tally, or GoHighLevel form. An embed genuinely exists but can’t be auto-submitted, so it’s detected and named for you to verify by hand.
                </Note>
                <Note>Your results (and the URL) stay on screen when you switch tabs or refresh. <strong>Clear</strong> wipes the view but keeps the saved result that Projects uses — “clear the view, keep the data.” Any result also has a <strong>Monitor…</strong> button to turn it into a scheduled check.</Note>
              </Section>

              <Section id="form-scheduler" title="Form Scheduler" eyebrow="Contact Forms">
                <P>The Scheduler re-tests a form <strong className="text-slate-200">automatically on a fixed schedule</strong> and alerts you when it changes or breaks — so you catch a silently-broken form within one cycle, instead of when leads dry up. It’s the Form Tester on a timer, tracking the result over time.</P>
                <UL>
                  <LI>Add a URL, a check frequency (e.g. every 3 days), and a mode. A baseline check runs immediately, then repeats on your interval.</LI>
                  <LI><strong className="text-slate-200">Pause / Resume</strong> any time (keeps its history), or <strong>Delete</strong> to remove it. Each card shows a recent-runs trend — % healthy plus a sparkline.</LI>
                  <LI>Each run records the verdict, the reason, what changed since last time, and a suggested next action — and sends a Slack alert.</LI>
                </UL>
                <Note tone="warn"><strong>Live mode submits a real entry every cycle</strong>, which lands in the client’s inbox/CRM. Use it only on forms you’re authorized to monitor — the test data identifies it as a health check.</Note>
              </Section>

              {/* ══ Site Health ══ */}
              <Section id="uptime-ssl" title="Uptime & SSL" eyebrow="Site Health">
                <P>Monitors three things a form check can’t catch — a site going <strong className="text-slate-200">down</strong>, an <strong className="text-slate-200">SSL certificate</strong> quietly expiring, and the quiet killer, a <strong className="text-slate-200">domain registration lapsing</strong> entirely.</P>
                <Table
                  headers={['Check', 'What you get']}
                  rows={[
                    [<b key="0">Uptime</b>, 'Up / down / reachable-but-challenged, with status code and response time.'],
                    [<b key="0">SSL</b>, 'Days until the certificate expires.'],
                    [<b key="0">Domain</b>, 'Days until the domain registration expires.'],
                  ]}
                />
                <P>Alerts fire <strong className="text-slate-200">only on change</strong>, never every cycle: <strong>down</strong> after two consecutive failed checks (flap protection) and again when it recovers; <strong>SSL</strong> and <strong>domain</strong> as each threshold is crossed (30 / 14 / 7 days, then expired), resetting on renewal. Each monitor shows an uptime % and a recent-checks sparkline, and can be paused/resumed.</P>
                <Note>A few heavily-protected sites return a challenge page to automated checks — FormPing classifies that as <em>reachable (challenged)</em>, not <em>down</em>, so it never cries wolf.</Note>
              </Section>

              <Section id="content-changes" title="Content Changes" eyebrow="Site Health">
                <P>Takes a <strong className="text-slate-200">snapshot</strong> of a site’s key pages, then later compares the current pages against the last snapshot and reports what changed — so a “small tweak” never silently breaks a page or its SEO.</P>
                <UL>
                  <LI>Detects meaningful <strong className="text-slate-200">content, SEO, form, and script</strong> changes (e.g. a heading rewritten, a meta description dropped, a form field removed, a tracking script added).</LI>
                  <LI>Tracking is <strong className="text-slate-200">site-level</strong> — it walks a whole site from its homepage, so URLs on the same site share one history.</LI>
                  <LI>Every check shows up on the project’s <strong>change timeline</strong>; expand a row to see the exact page-by-page before/after.</LI>
                </UL>
                <Note>Content changes are for your team only — they never appear on a client’s public status page.</Note>
              </Section>

              {/* ══ Projects ══ */}
              <Section id="projects" title="Projects & Unassigned" eyebrow="Projects">
                <P>A <strong className="text-slate-200">Project</strong> is a client and their URLs. Open one to see every monitor for that client — form health, uptime, SSL, and content changes — in a single view, plus a per-URL <strong>Dashboard</strong> for any one page.</P>
                <UL>
                  <LI>Any URL you’ve tested or monitored but not yet grouped shows up in an <strong className="text-slate-200">Unassigned</strong> bucket, with <strong>Assign to project</strong> and <strong>Dismiss</strong> actions — so nothing is a dead end.</LI>
                  <LI><strong className="text-slate-200">Remove</strong> a URL from a project → it drops to Unassigned and <em>keeps</em> its data and monitors. <strong>Delete</strong> a URL (or a whole project) is a complete, confirmed, irreversible removal of its monitors and results.</LI>
                  <LI>Each project can hold a <strong>contact</strong> — who to notify for that client.</LI>
                </UL>
              </Section>

              <Section id="status-pages" title="Client status pages" eyebrow="Projects">
                <P>Publish a <strong className="text-slate-200">clean, client-safe status page</strong> you can share with the client — a simple “is my site healthy?” view with none of the internal detail.</P>
                <UL>
                  <LI>It shows overall status, each site up/down, a 30-day uptime history, uptime % for 24h / 7d / 30d, a response-time trend, whether the contact form is working, and SSL validity. <strong className="text-slate-200">No reason codes, modes, notes, or full URLs</strong> ever appear.</LI>
                  <LI>You get an <strong>unguessable link</strong> that opens with <strong className="text-slate-200">no login</strong>. <strong>Regenerate</strong> it to invalidate the old one, or <strong>Turn off</strong> to revoke it — a revoked link just shows a not-found page.</LI>
                  <LI>Each URL can also have its <strong>own</strong> client share link (just that one page), generated and revoked independently.</LI>
                  <LI>Only projects where you’ve explicitly created a link are ever public. Your team also gets an internal <strong>View status</strong> for any project without publishing anything.</LI>
                </UL>
              </Section>

              {/* ══ Team ══ */}
              <Section id="access-roles" title="Access & roles" eyebrow="Team">
                <P>The app itself is private — sign-in is limited to your team’s authorized accounts. On top of who can get in, every user has a <strong className="text-slate-200">role</strong> that controls what they can do:</P>
                <Table
                  headers={['Role', 'Can']}
                  rows={[
                    [<b key="0">Owner</b>, 'Everything — plus manage admins and transfer ownership. Exactly one exists.'],
                    [<b key="0">Admin</b>, 'Full app, including deleting projects and managing members/viewers.'],
                    [<b key="0">Member</b>, 'Add URLs, create/run/edit monitors, view everything. No deleting, no user management. (The default.)'],
                    [<b key="0">Viewer</b>, 'Read-only.'],
                  ]}
                />
                <P>Permissions are enforced on the server for every action, not just hidden in the UI — a viewer genuinely can’t write, and only Admins+ can delete. Roles take effect immediately when changed. Admins and the Owner get a <strong>Team</strong> page to manage users and roles.</P>
              </Section>

              <Section id="alerts" title="Alerts" eyebrow="Team">
                <P>FormPing pings your team’s <strong className="text-slate-200">Slack channel</strong> when something needs attention — a scheduled form run, a site going down, or a certificate/domain nearing expiry. Each alert carries the URL, what happened, and a suggested next step, then links to the full detail in the app.</P>
                <UL>
                  <LI>Alerts are <strong className="text-slate-200">deduped</strong> (a retry or a restart can’t ping you twice) and rate-safe (spaced out, backing off if Slack is busy).</LI>
                  <LI>Alerts are <strong className="text-slate-200">internal-only</strong> — they go to your team, never to a client.</LI>
                  <LI>Slack delivery is optional and set up by an admin; if it isn’t configured, checks still run and record normally — only the Slack ping is skipped.</LI>
                </UL>
              </Section>

              {/* ══ Help ══ */}
              <Section id="faq" title="FAQ" eyebrow="Help">
                <Faq q="Is my client data private?">
                  Yes. The app and every piece of client data sit behind login. The only things that are ever public are (1) these product docs and (2) a client status page that <em>you</em> explicitly choose to publish — and that page shows only reassuring, non-technical health signals.
                </Faq>
                <Faq q="Who can read these docs?">
                  Anyone with the link. They’re general product documentation — there’s no client data, no account detail, and nothing sensitive here.
                </Faq>
                <Faq q="Do I need to install anything?">
                  No. FormPing runs entirely in the browser. Sign in and start adding URLs.
                </Faq>
                <Faq q="What happens if a form is a Typeform or HubSpot embed?">
                  It’s detected and named for you. Because a hosted embed lives on another domain, FormPing can’t auto-submit it — so it reports the embed exists and asks you to verify it by hand, rather than falsely saying “no form found.”
                </Faq>
                <Faq q="Will scheduled Live checks spam the client’s inbox?">
                  Each Live run does submit one real entry, clearly marked as a health check by its test data. Use Safe mode if you only need to confirm the form fills, or Live on forms you’re authorized to monitor.
                </Faq>
              </Section>

              <p className="mt-16 border-t border-slate-800 pt-6 text-xs text-slate-600">
                FormPing — contact-form QA &amp; site monitoring, an Apexure internal tool.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── primitives ──────────────────────────────────────────────────────────── */
function Section({ id, title, eyebrow, children }: { id: string; title: string; eyebrow?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 pt-14">
      {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300/80">{eyebrow}</p>}
      <h2 className="mb-4 mt-1 border-b border-slate-800 pb-2 text-xl font-bold text-slate-100">{title}</h2>
      {children}
    </section>
  );
}
function P({ children }: { children: ReactNode }) { return <p className="mb-4 leading-relaxed text-slate-300">{children}</p>; }
function UL({ children }: { children: ReactNode }) { return <ul className="mb-4 ml-1 space-y-2">{children}</ul>; }
function LI({ children }: { children: ReactNode }) {
  return <li className="flex gap-2.5 leading-relaxed text-slate-300"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400/70" /><span>{children}</span></li>;
}
function Code({ children }: { children: ReactNode }) {
  return <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-xs text-slate-200 ring-1 ring-slate-700">{children}</code>;
}
function Note({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warn' }) {
  const c = tone === 'warn' ? 'border-amber-500/25 bg-amber-500/10 text-amber-100' : 'border-indigo-500/20 bg-indigo-500/10 text-slate-200';
  return <div className={`my-4 rounded-lg border px-4 py-3 text-sm leading-relaxed ${c}`}>{children}</div>;
}
function Table({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="my-4 overflow-x-auto rounded-xl ring-1 ring-slate-800">
      <table className="w-full text-sm">
        <thead className="bg-slate-900"><tr>{headers.map((h, i) => (
          <th key={i} className="border-b border-slate-800 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">{h}</th>
        ))}</tr></thead>
        <tbody>{rows.map((row, i) => (
          <tr key={i} className="border-b border-slate-800/60 last:border-b-0">{row.map((cell, j) => (
            <td key={j} className="px-4 py-3 align-top text-slate-300">{cell}</td>
          ))}</tr>
        ))}</tbody>
      </table>
    </div>
  );
}
function Faq({ q, children }: { q: string; children: ReactNode }) {
  return (
    <div className="mb-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <p className="font-semibold text-slate-100">{q}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{children}</p>
    </div>
  );
}
function BrandMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 64 64" aria-hidden className="block">
      <defs><linearGradient id="fpDocsMark" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6366f1" /><stop offset="1" stopColor="#4338ca" /></linearGradient></defs>
      <rect width="64" height="64" rx="14" fill="url(#fpDocsMark)" />
      <rect x="14" y="12" width="27" height="29" rx="5" fill="#ffffff" />
      <rect x="19" y="18.4" width="17" height="3.2" rx="1.6" fill="#c7d2fe" />
      <rect x="19" y="24.4" width="17" height="3.2" rx="1.6" fill="#c7d2fe" />
      <rect x="19" y="30.4" width="11" height="3.2" rx="1.6" fill="#c7d2fe" />
      <circle cx="45" cy="46" r="8" fill="none" stroke="#ff6a2b" strokeWidth="2.4" opacity="0.5" />
      <circle cx="45" cy="46" r="4.2" fill="#ff6a2b" />
    </svg>
  );
}
