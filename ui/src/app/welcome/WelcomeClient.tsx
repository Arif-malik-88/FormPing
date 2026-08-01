'use client';

import { useEffect, useRef, useState } from 'react';

interface Stats {
  formsTested: number;
  siteChecks: number;
  alerts: number;
}

/**
 * Public landing page (FR-29), shown to logged-out visitors before the login
 * wall (middleware sends unauthenticated root → /welcome; logged-in users skip
 * it). Self-contained, on-brand marketing page: it reuses the app's exact tokens
 * (slate-950 ground, indigo gradient, the orange "ping" logo) and mirrors the
 * app's motion language. All animation is GPU-cheap and gated by reduced-motion.
 *
 * Styles are scoped with styled-jsx and CSS variables live on `.welcome-root`
 * (not :root) so nothing leaks into the rest of the app.
 */
export default function WelcomeClient() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  // Pull real aggregate volume metrics for the count-up (public endpoint —
  // counts only, no client/site identities).
  useEffect(() => {
    let alive = true;
    fetch('/api/stats', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d) setStats(d as Stats); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // Ambient "ping" field + scroll reveals + the status-card sparkline count-up.
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const root = rootRef.current;
    if (!root) return;
    const cleanups: Array<() => void> = [];

    // ── scroll reveals ──
    const revealEls = Array.from(root.querySelectorAll<HTMLElement>('.reveal'));
    let io: IntersectionObserver | null = null;
    if (reduce) {
      revealEls.forEach((e) => e.classList.add('reveal-on'));
    } else {
      io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) { en.target.classList.add('reveal-on'); io?.unobserve(en.target); }
        });
      }, { threshold: 0.14 });
      revealEls.forEach((e) => io!.observe(e));
      root.querySelectorAll<HTMLElement>('.hero .reveal, #statusCard').forEach((e) => e.classList.add('reveal-on'));
      const card = root.querySelector<HTMLElement>('#statusCard');
      const t = setTimeout(() => {
        card?.classList.add('reveal-on');
        const m = card?.querySelector<HTMLElement>('.v[data-count]');
        if (m) setTimeout(() => countUp(m), 520);
      }, 260);
      // clean up this timer via the outer return
      cleanups.push(() => clearTimeout(t));
    }

    // ── ambient radar (indigo rings, orange centre — echoes the logo) ──
    const cv = canvasRef.current;
    if (cv && !reduce) {
      const ctx = cv.getContext('2d');
      let w = 0, h = 0, dpr = 1, raf = 0;
      const anchors = [{ x: 0.82, y: 0.15 }, { x: 0.1, y: 0.28 }, { x: 0.6, y: 0.7 }];
      let pings: Array<{ x: number; y: number; r: number; life: number }> = [];
      let frame = 0;
      const size = () => {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        w = cv.width = window.innerWidth * dpr; h = cv.height = window.innerHeight * dpr;
        cv.style.width = window.innerWidth + 'px'; cv.style.height = window.innerHeight + 'px';
      };
      const spawn = () => {
        const a = anchors[Math.floor(Math.random() * anchors.length)]!;
        pings.push({ x: a.x, y: a.y, r: 0, life: 1 });
      };
      const loop = () => {
        if (!ctx) return;
        frame++; if (frame % 52 === 0) spawn();
        ctx.clearRect(0, 0, w, h);
        const maxR = Math.min(w, h) * 0.4;
        for (const p of pings) {
          p.r += 0.85 * dpr; p.life -= 0.006;
          const cx = p.x * w, cy = p.y * h, rr = p.r / maxR, a = Math.max(0, p.life) * (1 - rr) * 0.42;
          if (a <= 0) continue;
          ctx.beginPath(); ctx.arc(cx, cy, p.r, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(99,102,241,${a})`; ctx.lineWidth = 1.1 * dpr; ctx.stroke();
          ctx.beginPath(); ctx.arc(cx, cy, 2 * dpr, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,106,43,${Math.max(0, p.life) * 0.6})`; ctx.fill();
        }
        pings = pings.filter((p) => p.life > 0 && p.r < maxR);
        raf = requestAnimationFrame(loop);
      };
      size(); spawn(); loop();
      window.addEventListener('resize', size);
      cleanups.push(() => { cancelAnimationFrame(raf); window.removeEventListener('resize', size); });
    }

    return () => { io?.disconnect(); cleanups.forEach((c) => c()); };
  }, []);

  // Count the real stats up once they land + the strip is on screen.
  useEffect(() => {
    if (!stats) return;
    const root = rootRef.current;
    if (!root) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const nums = Array.from(root.querySelectorAll<HTMLElement>('.stat .num[data-key]'));
    const run = () => nums.forEach((el) => {
      const key = el.dataset.key as keyof Stats;
      const target = stats[key] ?? 0;
      if (reduce) { el.textContent = fmt(target); return; }
      countUp(el, target);
    });
    if (reduce) { run(); return; }
    const strip = root.querySelector<HTMLElement>('.stats');
    if (!strip) { run(); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { run(); io.disconnect(); }
    }, { threshold: 0.3 });
    io.observe(strip);
    return () => io.disconnect();
  }, [stats]);

  return (
    <div className="welcome-root" ref={rootRef}>
      <canvas className="radar" ref={canvasRef} aria-hidden />
      <div className="backdrop" aria-hidden />

      {/* reusable brand mark — the exact app artwork (icon.svg / Header / Login) */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
        <defs>
          <linearGradient id="fpMark" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#6366f1" /><stop offset="1" stopColor="#4338ca" />
          </linearGradient>
          <symbol id="fp" viewBox="0 0 64 64">
            <rect width="64" height="64" rx="14" fill="url(#fpMark)" />
            <rect x="14" y="12" width="27" height="29" rx="5" fill="#ffffff" />
            <rect x="19" y="18.4" width="17" height="3.2" rx="1.6" fill="#c7d2fe" />
            <rect x="19" y="24.4" width="17" height="3.2" rx="1.6" fill="#c7d2fe" />
            <rect x="19" y="30.4" width="11" height="3.2" rx="1.6" fill="#c7d2fe" />
            <circle cx="45" cy="46" r="8" fill="none" stroke="#ff6a2b" strokeWidth="2.4" opacity="0.5" />
            <circle cx="45" cy="46" r="4.2" fill="#ff6a2b" />
          </symbol>
        </defs>
      </svg>

      <nav>
        <div className="wrap nav-inner">
          <div className="brand">
            <span className="markwrap">
              <svg className="mark" width="36" height="36" aria-hidden><use href="#fp" /></svg>
              <span className="ripple" aria-hidden />
            </span>
            <div className="txt"><span className="bn">FormPing</span><span className="bs">Contact Form QA &amp; Site Monitor</span></div>
          </div>
          <div className="nav-links">
            <a className="lnk hide-sm" href="#capabilities">Capabilities</a>
            <a className="lnk hide-sm" href="#how">How it works</a>
            <a className="lnk" href="/docs">Docs</a>
            <a className="btn btn-primary" href="/login">Sign in →</a>
          </div>
        </div>
      </nav>

      <header className="wrap">
        <div className="hero">
          <div className="hero-copy">
            <span className="eyebrow reveal">Forms · Uptime · SSL · Content — watched</span>
            <h1 className="reveal" style={{ transitionDelay: '.05s' }}>
              Catch a broken client site <span className="mark-txt">before the client does</span>.
            </h1>
            <p className="lede reveal" style={{ transitionDelay: '.1s' }}>
              FormPing quietly tests every client&apos;s <b>contact forms</b>, <b>uptime</b>, <b>SSL</b>, and <b>page changes</b> — then pings you the moment something breaks. One dashboard, one shareable status page per client.
            </p>
            <div className="hero-cta reveal" style={{ transitionDelay: '.15s' }}>
              <a className="btn btn-primary" href="/login">Sign in to FormPing →</a>
              <a className="btn btn-ghost" href="/docs">Read the docs</a>
            </div>
            <div className="meta-row reveal" style={{ transitionDelay: '.2s' }}>
              <span className="meta"><Check />Built for agencies</span>
              <span className="meta"><Check />No lead falls through</span>
              <span className="meta"><Check />Round-the-clock</span>
            </div>
          </div>

          <div className="card reveal" id="statusCard" style={{ transitionDelay: '.12s' }}>
            <div className="card-head">
              <div className="client">
                <div className="logo">A</div>
                <div><div className="name">Acme Interiors</div><div className="url">acmeinteriors.com</div></div>
              </div>
              <span className="live"><span className="d" />Live</span>
            </div>
            <div className="rows">
              <Row icon={<IconForm />} label="Contact form" sub="Filled &amp; submitted · 2m ago" pill="HEALTHY" tone="ok" />
              <Row icon={<IconClock />} label="Uptime" sub="Checked every 5 min" pill="99.98%" tone="ok" />
              <Row icon={<IconShield />} label="SSL certificate" sub="Warns before it lapses" pill="42 DAYS" tone="warn" />
              <Row icon={<IconDoc />} label="Content changes" sub="Homepage · pricing" pill="2 TRACKED" tone="info" />
            </div>
            <div className="spark">
              <div className="spark-top"><span className="t">Response time · 24h</span><span className="v" data-count="312" data-suffix=" ms">312 ms</span></div>
              <svg viewBox="0 0 300 44" preserveAspectRatio="none">
                <path className="line" d="M0,30 L25,26 L50,29 L75,19 L100,23 L125,13 L150,17 L175,11 L200,21 L225,15 L250,10 L275,14 L300,9" />
                <circle className="halo" cx="300" cy="9" r="3" />
                <circle className="dot" cx="300" cy="9" r="3" />
              </svg>
            </div>
          </div>
        </div>
      </header>

      {/* real, animated volume metrics (public counts only) */}
      <section className="wrap">
        <div className="stats reveal">
          <div className="stat"><span className="num" data-key="formsTested">0</span><span className="lab">Forms tested</span></div>
          <div className="stat"><span className="num" data-key="siteChecks">0</span><span className="lab">Uptime &amp; SSL checks</span></div>
          <div className="stat"><span className="num" data-key="alerts">0</span><span className="lab">Alerts delivered</span></div>
        </div>
      </section>

      <section className="features wrap" id="capabilities">
        <div className="sec-head reveal">
          <span className="kicker">What it watches</span>
          <h2>Four checks, one quiet watchdog</h2>
          <p>Every client URL is watched across everything that actually loses leads — and it tells you <em>why</em>, not just that something&apos;s off.</p>
        </div>
        <div className="grid">
          <Feat icon={<IconForm big />} title="Contact-form testing">
            Finds, fills, and submits the form on a schedule — and knows the difference between “working”, a non-contact form, and a Typeform / HubSpot embed it can’t submit for you.
          </Feat>
          <Feat icon={<IconClock big />} title="Uptime & SSL" delay=".05s">
            Round-the-clock availability checks with response-time trends, plus SSL certificate and domain-expiry warnings well before anything lapses.
          </Feat>
          <Feat icon={<IconDoc big />} title="Content & change monitor">
            Snapshots key pages and flags meaningful content, SEO, form, and script changes over time — so a “small tweak” never silently breaks a page.
          </Feat>
          <Feat icon={<IconFolder big />} title="Projects & status pages" delay=".05s">
            Group a client’s URLs into one project with a per-URL dashboard — and hand the client a live, login-free status page for just their sites.
          </Feat>
        </div>
      </section>

      <section className="how wrap" id="how">
        <div className="sec-head reveal">
          <span className="kicker">How it works</span>
          <h2>Add a URL. Get pinged.</h2>
        </div>
        <div className="steps">
          <Step n="STEP 01" title="Add the client's URLs">Drop in a contact page, a homepage, or a whole landing funnel. Group them under the client as a project.</Step>
          <Step n="STEP 02" title="FormPing watches" delay=".05s">Forms, uptime, SSL, and content are checked on the schedule you pick — no babysitting, no cron to wire up.</Step>
          <Step n="STEP 03" title="You get the ping" delay=".1s">A Slack alert the moment something breaks, with the reason attached — plus a shareable status page for the client.</Step>
        </div>
      </section>

      <section className="wrap">
        <div className="band reveal">
          <h2>Stop finding out from the client.</h2>
          <p>Sign in to see every client&apos;s forms, uptime, SSL, and changes on one board — or read the docs to see how each check works.</p>
          <div className="hero-cta">
            <a className="btn btn-primary" href="/login">Sign in to FormPing →</a>
            <a className="btn btn-ghost" href="/docs">Read the docs</a>
          </div>
        </div>
      </section>

      <footer className="site-foot">
        <div className="wrap foot">
          <div className="l"><svg width="20" height="20" aria-hidden><use href="#fp" /></svg><span><b>FormPing</b> · Apexure internal QA &amp; monitoring</span></div>
          <div className="r"><a href="/docs">Docs</a><a href="/login">Sign in</a><a href="#capabilities">Capabilities</a></div>
        </div>
      </footer>

      {/* Plain server-rendered <style> (not styled-jsx): the CSS ships in the
          initial HTML so there's no flash of unstyled content on load. Safe to
          be page-global because every selector is scoped under `.welcome-root`. */}
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
    </div>
  );
}

/* ── tiny presentational helpers ─────────────────────────────────────────── */
function Row({ icon, label, sub, pill, tone }: { icon: React.ReactNode; label: string; sub: string; pill: string; tone: 'ok' | 'warn' | 'info' }) {
  return (
    <div className="row">
      <span className="ic">{icon}</span>
      <span className="lbl">{label}<small>{sub}</small></span>
      <span className={`pill ${tone}`}>{pill}</span>
    </div>
  );
}
function Feat({ icon, title, delay, children }: { icon: React.ReactNode; title: string; delay?: string; children: React.ReactNode }) {
  return (
    <article className="feat reveal" style={delay ? { transitionDelay: delay } : undefined}>
      <div className="fico">{icon}</div>
      <h3>{title}</h3>
      <p>{children}</p>
    </article>
  );
}
function Step({ n, title, delay, children }: { n: string; title: string; delay?: string; children: React.ReactNode }) {
  return (
    <div className="step reveal" style={delay ? { transitionDelay: delay } : undefined}>
      <div className="n">{n}</div><h4>{title}</h4><p>{children}</p>
    </div>
  );
}

/* ── icons (currentColor) ────────────────────────────────────────────────── */
const sz = (big?: boolean) => (big ? 21 : 16);
function Check() { return <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.7-9.3a1 1 0 00-1.4-1.4L9 10.6 7.7 9.3a1 1 0 00-1.4 1.4l2 2a1 1 0 001.4 0z" clipRule="evenodd" /></svg>; }
function IconForm({ big }: { big?: boolean }) { return <svg width={sz(big)} height={sz(big)} viewBox="0 0 20 20" fill="currentColor"><path d="M3 4a2 2 0 012-2h10a2 2 0 012 2v9a2 2 0 01-2 2h-3l-2 3-2-3H5a2 2 0 01-2-2z" /></svg>; }
function IconClock({ big }: { big?: boolean }) { return <svg width={sz(big)} height={sz(big)} viewBox="0 0 20 20" fill="currentColor"><path d="M10 1a9 9 0 100 18 9 9 0 000-18zm1 4a1 1 0 10-2 0v5a1 1 0 00.4.8l3 2.2a1 1 0 101.2-1.6L11 9.5z" /></svg>; }
function IconShield() { return <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 1l7 3v5c0 4.4-3 8.3-7 10-4-1.7-7-5.6-7-10V4z" clipRule="evenodd" /></svg>; }
function IconDoc({ big }: { big?: boolean }) { return <svg width={sz(big)} height={sz(big)} viewBox="0 0 20 20" fill="currentColor"><path d="M4 3h12a1 1 0 011 1v3H3V4a1 1 0 011-1zM3 9h14v7a1 1 0 01-1 1H4a1 1 0 01-1-1z" /></svg>; }
function IconFolder({ big }: { big?: boolean }) { return <svg width={sz(big)} height={sz(big)} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 3h5l2 2h5a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z" clipRule="evenodd" /></svg>; }

/* ── count-up + format ───────────────────────────────────────────────────── */
function fmt(n: number): string { return n.toLocaleString('en-US'); }
function countUp(el: HTMLElement, target?: number) {
  const t = target != null ? target : parseFloat(el.dataset.count || '0');
  const suffix = el.dataset.suffix || '';
  const dur = 1300, start = performance.now();
  const tick = (now: number) => {
    const p = Math.min(1, (now - start) / dur);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = (target != null ? fmt(Math.round(t * e)) : String(Math.round(t * e))) + suffix;
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = (target != null ? fmt(t) : String(t)) + suffix;
  };
  requestAnimationFrame(tick);
}

/* ── scoped styles (tokens on .welcome-root, not :root) ──────────────────── */
const STYLES = `
  .welcome-root {
    --bg:#020617; --panel:#0f172a; --panel-2:#111a2e; --line:#1e293b; --line-2:#334155;
    --text:#f1f5f9; --slate-200:#e2e8f0; --slate-300:#cbd5e1; --muted:#94a3b8; --muted-2:#64748b; --muted-3:#475569;
    --indigo:#6366f1; --indigo-600:#4f46e5; --indigo-400:#818cf8; --indigo-300:#a5b4fc; --ping:#ff6a2b;
    --ok:#34d399; --ok-t:#6ee7b7; --warn:#fbbf24; --warn-t:#fcd34d; --down:#f87171;
    --font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
    --maxw:1200px;
    position:relative; min-height:100vh; background:var(--bg); color:var(--text);
    letter-spacing:-0.011em; overflow-x:hidden;
  }
  .welcome-root .radar { position:fixed; inset:0; width:100%; height:100%; z-index:0; pointer-events:none; }
  .welcome-root .backdrop { position:fixed; inset:0; z-index:0; pointer-events:none;
    background: radial-gradient(880px 500px at 80% -6%, rgba(99,102,241,0.15), transparent 70%), radial-gradient(680px 460px at 6% 2%, rgba(67,56,202,0.10), transparent 66%); }
  .welcome-root .backdrop::after { content:""; position:absolute; inset:0;
    background-image: linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px);
    background-size:48px 48px; -webkit-mask-image: radial-gradient(circle at 50% 26%, #000 0%, transparent 70%); mask-image: radial-gradient(circle at 50% 26%, #000 0%, transparent 70%); }

  .welcome-root .wrap { position:relative; z-index:2; max-width:var(--maxw); margin:0 auto; padding:0 24px; }

  .welcome-root nav { position:sticky; top:0; z-index:20; background:rgba(2,6,23,0.8); backdrop-filter:blur(8px); border-bottom:1px solid var(--line); }
  .welcome-root .nav-inner { display:flex; align-items:center; justify-content:space-between; height:70px; gap:16px; }
  .welcome-root .brand { display:flex; align-items:center; gap:12px; min-width:0; }
  .welcome-root .markwrap { position:relative; display:inline-flex; }
  .welcome-root .mark { border-radius:9px; box-shadow:0 8px 18px -8px rgba(49,46,129,0.9); display:block; flex-shrink:0; }
  .welcome-root .ripple { position:absolute; left:70%; top:72%; width:10px; height:10px; margin:-5px 0 0 -5px; border-radius:50%; border:2px solid var(--ping); opacity:0; animation:ripple 2.8s ease-out infinite; }
  @keyframes ripple { 0%{transform:scale(.4);opacity:.75;} 70%{opacity:0;} 100%{transform:scale(2.4);opacity:0;} }
  .welcome-root .brand .bn { display:block; font-size:1.02rem; font-weight:700; color:var(--text); line-height:1; letter-spacing:-0.02em; }
  .welcome-root .brand .bs { display:block; font-size:0.7rem; color:var(--muted-2); margin-top:3px; }
  .welcome-root .nav-links { display:flex; align-items:center; gap:6px; }
  .welcome-root .lnk { color:var(--muted); text-decoration:none; font-size:0.82rem; font-weight:500; padding:8px 12px; border-radius:9px; transition:color .18s, background .18s; }
  .welcome-root .lnk:hover { color:var(--text); background:rgba(148,163,184,0.08); }

  .welcome-root .btn { display:inline-flex; align-items:center; gap:8px; cursor:pointer; white-space:nowrap; font-size:0.82rem; font-weight:600; text-decoration:none; padding:9px 15px; border-radius:10px; border:1px solid transparent; transition:transform .15s, box-shadow .2s, background .2s, border-color .2s; }
  .welcome-root .btn-primary { position:relative; overflow:hidden; color:#fff; background:linear-gradient(to bottom, var(--indigo), var(--indigo-600)); box-shadow:0 6px 16px -6px rgba(79,70,229,0.6), inset 0 0 0 1px rgba(129,140,248,0.35); }
  .welcome-root .btn-primary::after { content:""; position:absolute; inset:0; pointer-events:none; background:linear-gradient(110deg, transparent 32%, rgba(255,255,255,0.22) 50%, transparent 68%); transform:translateX(-130%); transition:transform .6s ease; }
  .welcome-root .btn-primary:hover { transform:translateY(-1px); box-shadow:0 10px 22px -8px rgba(79,70,229,0.8), inset 0 0 0 1px rgba(129,140,248,0.45); }
  .welcome-root .btn-primary:hover::after { transform:translateX(130%); }
  .welcome-root .btn-ghost { color:var(--slate-300); background:var(--panel); border-color:var(--line-2); }
  .welcome-root .btn-ghost:hover { color:var(--text); background:#16213a; transform:translateY(-1px); }

  .welcome-root .hero { display:grid; grid-template-columns:1.05fr 0.95fr; gap:56px; align-items:center; padding:88px 0 60px; }
  .welcome-root .eyebrow { display:inline-flex; align-items:center; gap:10px; margin-bottom:22px; font-size:0.72rem; font-weight:600; letter-spacing:0.14em; text-transform:uppercase; color:var(--indigo-300); }
  .welcome-root .eyebrow::before { content:""; width:24px; height:1px; background:linear-gradient(90deg, var(--indigo), transparent); }
  .welcome-root h1 { font-size:clamp(2.5rem, 5.6vw, 3.85rem); line-height:1.03; letter-spacing:-0.035em; font-weight:800; text-wrap:balance; margin-bottom:22px; color:var(--text); }
  .welcome-root h1 .mark-txt { color:var(--indigo-300); }
  .welcome-root .lede { font-size:1.16rem; color:var(--muted); max-width:35ch; margin-bottom:30px; line-height:1.55; }
  .welcome-root .lede b { color:var(--slate-200); font-weight:600; }
  .welcome-root .hero-cta { display:flex; flex-wrap:wrap; gap:12px; align-items:center; }
  .welcome-root .hero-cta .btn { padding:12px 20px; font-size:0.92rem; border-radius:11px; }
  .welcome-root .meta-row { display:flex; gap:22px; margin-top:32px; flex-wrap:wrap; }
  .welcome-root .meta { display:flex; align-items:center; gap:8px; font-size:0.82rem; color:var(--muted); }
  .welcome-root .meta svg { color:var(--ok); flex-shrink:0; }

  .welcome-root .card { position:relative; background:linear-gradient(180deg, var(--panel-2), var(--panel)); border:1px solid var(--line); border-radius:16px; padding:18px; box-shadow:0 40px 80px -44px rgba(0,0,0,0.85); }
  .welcome-root .card-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:15px; }
  .welcome-root .client { display:flex; align-items:center; gap:12px; }
  .welcome-root .client .logo { width:40px; height:40px; border-radius:11px; display:grid; place-items:center; background:linear-gradient(135deg, var(--indigo), #4338ca); color:#fff; font-weight:800; font-size:1.05rem; box-shadow:0 8px 16px -8px rgba(49,46,129,0.9); }
  .welcome-root .client .name { font-weight:700; font-size:0.96rem; color:var(--text); }
  .welcome-root .client .url { font-family:var(--font-mono); font-size:0.7rem; color:var(--muted-2); }
  .welcome-root .live { font-size:0.62rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:var(--ok-t); display:inline-flex; align-items:center; gap:7px; padding:5px 10px; border-radius:999px; background:rgba(52,211,153,0.1); border:1px solid rgba(52,211,153,0.25); }
  .welcome-root .live .d { width:7px; height:7px; border-radius:50%; background:var(--ok); box-shadow:0 0 0 0 rgba(52,211,153,0.5); animation:pingpulse 2.4s infinite; }
  @keyframes pingpulse { 0%{box-shadow:0 0 0 0 rgba(52,211,153,0.5);} 70%{box-shadow:0 0 0 7px rgba(52,211,153,0);} 100%{box-shadow:0 0 0 0 rgba(52,211,153,0);} }
  .welcome-root .rows { display:flex; flex-direction:column; gap:8px; }
  .welcome-root .row { display:grid; grid-template-columns:18px 1fr auto; align-items:center; gap:12px; padding:11px 12px; border-radius:11px; background:rgba(148,163,184,0.035); border:1px solid var(--line); }
  .welcome-root #statusCard.reveal-on .row { animation:rowin .5s cubic-bezier(0.2,0.7,0.2,1) both; }
  .welcome-root #statusCard.reveal-on .row:nth-child(1){animation-delay:.16s;}
  .welcome-root #statusCard.reveal-on .row:nth-child(2){animation-delay:.26s;}
  .welcome-root #statusCard.reveal-on .row:nth-child(3){animation-delay:.36s;}
  .welcome-root #statusCard.reveal-on .row:nth-child(4){animation-delay:.46s;}
  @keyframes rowin { from{opacity:0; transform:translateX(10px);} to{opacity:1; transform:none;} }
  .welcome-root .row .ic { color:var(--muted-2); display:grid; place-items:center; }
  .welcome-root .row .lbl { font-size:0.85rem; color:var(--text); font-weight:500; }
  .welcome-root .row .lbl small { display:block; font-size:0.71rem; color:var(--muted-2); font-weight:400; margin-top:1px; }
  .welcome-root .pill { font-family:var(--font-mono); font-size:0.68rem; font-weight:600; padding:4px 9px; border-radius:6px; white-space:nowrap; font-variant-numeric:tabular-nums; }
  .welcome-root .pill.ok { color:var(--ok-t); background:rgba(52,211,153,0.12); }
  .welcome-root .pill.warn { color:var(--warn-t); background:rgba(251,191,36,0.12); }
  .welcome-root .pill.info { color:var(--indigo-300); background:rgba(99,102,241,0.15); }
  .welcome-root .spark { margin-top:12px; padding:12px; border-radius:11px; background:rgba(148,163,184,0.035); border:1px solid var(--line); }
  .welcome-root .spark-top { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:6px; }
  .welcome-root .spark-top .t { font-family:var(--font-mono); font-size:0.64rem; letter-spacing:0.06em; text-transform:uppercase; color:var(--muted-2); }
  .welcome-root .spark-top .v { font-family:var(--font-mono); font-size:0.78rem; color:var(--ok-t); font-variant-numeric:tabular-nums; }
  .welcome-root .spark svg { width:100%; height:44px; display:block; overflow:visible; }
  .welcome-root .spark path.line { fill:none; stroke:var(--ok); stroke-width:2; stroke-linecap:round; stroke-linejoin:round; stroke-dasharray:620; stroke-dashoffset:620; }
  .welcome-root .reveal-on .spark path.line { animation:draw 1.5s .5s cubic-bezier(0.2,0.7,0.2,1) forwards; }
  @keyframes draw { to { stroke-dashoffset:0; } }
  .welcome-root .spark circle.dot { fill:var(--ok); opacity:0; }
  .welcome-root .reveal-on .spark circle.dot { animation:dotin .5s 1.8s cubic-bezier(0.2,0.7,0.2,1) forwards; }
  @keyframes dotin { from{opacity:0;r:0;} to{opacity:1;r:3;} }
  .welcome-root .spark circle.halo { fill:none; stroke:var(--ok); opacity:0; }
  .welcome-root .reveal-on .spark circle.halo { animation:halo 2.2s 2.3s ease-out infinite; }
  @keyframes halo { 0%{opacity:.5;r:3;} 100%{opacity:0;r:11;} }

  .welcome-root .stats { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin:12px 0 8px; padding:26px; border-radius:16px; border:1px solid var(--line); background:linear-gradient(180deg, rgba(15,23,42,0.6), rgba(15,23,42,0.3)); text-align:center; }
  .welcome-root .stat { display:flex; flex-direction:column; gap:6px; }
  .welcome-root .stat .num { font-size:clamp(1.8rem,4vw,2.5rem); font-weight:800; letter-spacing:-0.03em; color:var(--text); font-variant-numeric:tabular-nums; line-height:1; }
  .welcome-root .stat .lab { font-size:0.8rem; color:var(--muted); }

  .welcome-root section { position:relative; z-index:2; }
  .welcome-root .sec-head { max-width:640px; margin:0 auto 46px; text-align:center; }
  .welcome-root .kicker { font-size:0.72rem; font-weight:600; letter-spacing:0.14em; text-transform:uppercase; color:var(--indigo-300); }
  .welcome-root .sec-head h2 { font-size:clamp(1.7rem,3.5vw,2.2rem); letter-spacing:-0.03em; font-weight:800; margin:12px 0 12px; text-wrap:balance; }
  .welcome-root .sec-head p { color:var(--muted); font-size:1.02rem; }
  .welcome-root .sec-head p em { color:var(--slate-300); font-style:italic; }
  .welcome-root .features { padding:56px 0 24px; }
  .welcome-root .grid { display:grid; grid-template-columns:repeat(2,1fr); gap:16px; }
  .welcome-root .feat { background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:24px; transition:transform .25s ease, border-color .25s ease, box-shadow .25s ease; }
  .welcome-root .feat:hover { transform:translateY(-3px); border-color:var(--line-2); box-shadow:0 24px 44px -30px rgba(0,0,0,0.9); }
  .welcome-root .fico { width:44px; height:44px; border-radius:11px; display:grid; place-items:center; margin-bottom:16px; background:rgba(99,102,241,0.12); border:1px solid rgba(99,102,241,0.25); color:var(--indigo-300); transition:transform .25s ease, background .25s ease; }
  .welcome-root .feat:hover .fico { transform:translateY(-2px) scale(1.05); background:rgba(99,102,241,0.18); }
  .welcome-root .feat h3 { font-size:1.08rem; font-weight:700; letter-spacing:-0.02em; margin-bottom:7px; color:var(--text); }
  .welcome-root .feat p { color:var(--muted); font-size:0.9rem; }

  .welcome-root .how { padding:64px 0 24px; }
  .welcome-root .steps { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
  .welcome-root .step { padding:22px; border-radius:14px; border:1px solid var(--line); background:rgba(15,23,42,0.5); }
  .welcome-root .step .n { font-family:var(--font-mono); font-size:0.68rem; color:var(--indigo-300); letter-spacing:0.08em; }
  .welcome-root .step h4 { font-size:1.02rem; font-weight:700; margin:10px 0 6px; letter-spacing:-0.01em; }
  .welcome-root .step p { color:var(--muted); font-size:0.88rem; }

  .welcome-root .band { margin:78px 0 0; padding:56px 40px; border-radius:20px; text-align:center; position:relative; overflow:hidden; background:radial-gradient(680px 280px at 50% 0%, rgba(99,102,241,0.2), transparent 70%), var(--panel); border:1px solid var(--line-2); }
  .welcome-root .band h2 { font-size:clamp(1.7rem,3.5vw,2.2rem); letter-spacing:-0.03em; font-weight:800; margin-bottom:12px; text-wrap:balance; }
  .welcome-root .band p { color:var(--muted); margin:0 auto 24px; max-width:46ch; }
  .welcome-root .band .hero-cta { justify-content:center; }

  .welcome-root .site-foot { position:relative; z-index:2; margin-top:56px; border-top:1px solid var(--line); }
  .welcome-root .foot { display:flex; align-items:center; justify-content:space-between; padding:24px 0; flex-wrap:wrap; gap:14px; }
  .welcome-root .foot .l { display:flex; align-items:center; gap:10px; color:var(--muted-2); font-size:0.82rem; }
  .welcome-root .foot .l b { color:var(--text); }
  .welcome-root .foot .r { display:flex; gap:18px; }
  .welcome-root .foot .r a { color:var(--muted); text-decoration:none; font-size:0.82rem; }
  .welcome-root .foot .r a:hover { color:var(--text); }

  .welcome-root .reveal { opacity:0; transform:translateY(14px); transition:opacity .55s ease, transform .55s cubic-bezier(0.2,0.7,0.2,1); }
  .welcome-root .reveal.reveal-on { opacity:1; transform:none; }

  @media (max-width:900px) { .welcome-root .hero { grid-template-columns:1fr; gap:44px; padding:60px 0 44px; } }
  @media (max-width:760px) { .welcome-root .grid, .welcome-root .steps { grid-template-columns:1fr; } .welcome-root .stats { grid-template-columns:1fr; gap:22px; } }
  @media (max-width:720px) { .welcome-root .hide-sm { display:none; } }
  @media (max-width:560px) { .welcome-root .brand .bs { display:none; } }

  @media (prefers-reduced-motion: reduce) {
    .welcome-root *, .welcome-root *::before, .welcome-root *::after { animation:none !important; transition:none !important; }
    .welcome-root .reveal { opacity:1; transform:none; }
    .welcome-root .spark path.line { stroke-dashoffset:0; }
    .welcome-root .spark circle.dot { opacity:1; }
  }
`;
