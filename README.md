<div align="center">

# FormPing

### Contact-form QA & website monitoring — in one place

Find, fill and verify contact forms on sites you own or are authorized to test, and keep watch on uptime, SSL, and meaningful content changes over time. Group everything by client, and share a clean, live status page with them.

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js%2014-000000?style=flat&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React%2018-20232A?style=flat&logo=react&logoColor=61DAFB)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat&logo=playwright&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)
![CI](https://github.com/waseembashir/FormPing/actions/workflows/ci.yml/badge.svg)

</div>

---

## Contents

- [What FormPing is](#what-formping-is)
- [The web app](#the-web-app)
- [How form testing works](#how-form-testing-works)
- [Website change monitoring](#website-change-monitoring)
- [Client status pages](#client-status-pages)
- [Roles & access](#roles--access)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Command-line engine](#command-line-engine)
- [Reference](#reference)
- [Contributing](#contributing)
- [Responsible use](#responsible-use)

---

## What FormPing is

FormPing is two things that share one engine:

1. **A web app** — the day-to-day product. Organize clients and their URLs into **projects**, run and schedule contact-form tests, monitor uptime / SSL / content changes, and hand each client a live, non-technical **status page**.
2. **A command-line engine** — the same detection and monitoring logic as a scriptable CLI, for one-off runs, batches, and CI.

Everything the app shows is built on top of the engine, so a result means the same thing whether it came from a scheduled monitor or a terminal command.

---

## The web app

The app is organized around **Projects** (a client and their URLs), with two tool areas — **Contact Forms** and **Site Health** — plus Team and Docs.

| Area | What it does |
|------|--------------|
| **Projects** | Group a client's URLs into a project and see their form, uptime and SSL health at a glance. URLs you've tested or monitored but not grouped yet surface in an **Unassigned** bucket to assign or dismiss, so nothing is ever invisible. |
| **Contact Forms** | **Form Tester** — run an on-demand test against a URL; results persist across refreshes. **Form Scheduler** — recurring form tests with alerts when a form changes or breaks. |
| **Site Health** | **Uptime & SSL** — availability plus certificate and domain expiry monitoring. **Content Changes** — track content, SEO, form and script changes over time, with an optional AI summary of each diff. |
| **Status pages** | A live, client-safe health page per client (and per single URL), shareable with no login. An internal, richer version is available to the team. |
| **Team** | Manage who can do what (roles), and triage bug reports submitted from within the app. |

Every action that changes or removes data is confirmed first, and the copy always makes clear what will happen — especially whether a form test will actually **submit**.

---

## How form testing works

Given a URL, the engine:

1. Discovers the contact page using deterministic heuristics (path matching + anchor-text scoring). If a site doesn't use a conventional contact slug, a **content-driven fallback** scans the homepage, navigation, and sitemap pages and picks the one that actually holds a contact form — so the form is found regardless of the page's URL.
2. Verifies the top candidates by loading them and scoring the page content.
3. Detects the main contact form (field types, submit-button text, layout signals).
4. Fills it with configurable test data.
5. Optionally submits and watches for a thank-you redirect or an inline success message.
6. Returns a structured result explaining exactly what happened.

**Three test modes** put safety first:

| Mode | Behavior |
|------|----------|
| `safe` *(default)* | Find the page and form, fill the fields — **never submit**. |
| `detect-only` | Find the contact page and form; don't fill or submit. |
| `live` | The full flow **including submission** — only on sites you're authorized to test. |

**Landing-page mode** skips contact-page discovery and detects the form directly on the given URL — for standalone landing pages with an inline form and no separate `/contact` page. In this mode detection is also more lenient: since you've asserted the form is here, the best-scoring form is accepted even if it wouldn't clear the classic contact-form threshold (a quiz, assessment, or booking form is still a real form).

**When a form isn't submitted, the result says _why_** rather than a blunt "not found":

- **`FORM_NOT_FOUND`** — genuinely nothing: no native form and no known embed.
- **`NON_CONTACT_FORM_FOUND`** — a form exists but scored as something else (search / newsletter / quiz); the notes carry its score and the missing contact fields.
- **`THIRD_PARTY_EMBED_FORM`** — a hosted embed (Typeform, HubSpot, Calendly, Jotform, Tally, and similar) is present. It's detected and named so you can verify it by hand, even though it can't be auto-filled across origins.

CAPTCHA and anti-bot systems are **never bypassed** — if one is detected, the run stops and says so.

---

## Website change monitoring

The monitor snapshots a small set of important pages (home, about, pricing, services, contact, thank-you) and compares them over time:

- **Content** — H1 changes, major text deltas, CTA/button text.
- **SEO** — title, meta description, canonical, robots.
- **Forms** — a field added or removed, a field becoming required, a type change.
- **Technical** — new or removed tracking scripts, load-time spikes.
- **Site-level** — a page appears or disappears.

Each change is graded **low / medium / high** so you can tell a cosmetic tweak from a material one, and an optional AI summary turns the diff into a readable paragraph. It's cheap by default — plain HTML fetching is used for parsing, and a full browser only launches when screenshots are requested.

---

## Client status pages

One presentation powers both a public and an internal view, curated so nothing technical can reach a client:

- **Public status page** — client-safe only: the page URL, overall status, uptime %, uptime history, SSL validity, and whether the contact form is working. No response times, reason codes, or content-change detail.
- **Internal dashboard** — the full picture for the team: response-time and uptime charts, HTTP status, check frequency, domain expiry, and the content-change timeline (each run expands to show what changed).

Content diffs are internal-only by design — "84 changes detected" would alarm a client about what is often their own team's intentional edits. Both views carry a **Today / 7 days / 30 days / All-time** filter.

---

## Roles & access

Signing in is limited to approved domains; on top of that, each person has a role that decides what they can do:

| Role | Can |
|------|-----|
| **Owner** *(exactly one)* | Everything, plus manage admins and transfer ownership. |
| **Admin** | Full app, including deleting projects and managing members and viewers. |
| **Member** *(default)* | Add URLs, run and edit monitors, rename and edit projects, view everything. |
| **Viewer** | Read-only. |

Enforcement is **server-side on every write** — the interface hides what a role can't do, but the server is the real gate. Roles are read fresh on each request, so a change takes effect immediately. There is always exactly one owner, and ownership is transferred (never left empty), so the app can't be locked out.

---

## Tech stack

- **Web app** — Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS. A single design-token system drives the whole UI in one coherent dark theme.
- **Engine** — TypeScript, [Playwright](https://playwright.dev) for real-browser form testing, and lightweight HTML parsing for fast change detection.
- **Data** — PostgreSQL for structured data; captured page snapshots are kept on disk for diffing.
- **Testing** — [Vitest](https://vitest.dev) for the engine's detection and analysis logic, and [Playwright](https://playwright.dev) end-to-end tests for the web app.

---

## Project structure

```
formping/
├── src/            # the CLI engine — form detection, testing, change monitoring
├── tests/          # engine unit tests (Vitest)
└── ui/             # the Next.js web app (App Router)
    └── src/
        ├── app/            # routes, pages, and API endpoints
        ├── components/     # UI — a shared component kit + per-feature views
        └── lib/            # app logic: projects, monitors, status, auth, design tokens
```

The root package is the engine; `ui/` is the web app and has its own dependencies.

---

## Getting started

**Prerequisites:** Node.js ≥ 18 and npm ≥ 9.

**Engine (CLI):**

```bash
npm install
npx playwright install chromium
npm test          # run the engine test suite
```

**Web app:**

```bash
cd ui
npm install
npm run dev       # http://localhost:3000
```

**End-to-end tests** (Playwright) run the web app in a browser. They're hermetic — auth, database, and Slack are disabled for the run, so they need no secrets and touch no real services:

```bash
cd ui
npx playwright install chromium   # one-time browser download
npm run test:e2e                  # boots the app and runs the e2e suite
```

Configuration (auth, database, and optional integrations) is supplied through environment variables — copy `.env.example` and fill in your own values.

---

## Command-line engine

The same logic the app uses, as a script.

<details>
<summary><strong>Form testing</strong></summary>

```bash
# Single URL — safe mode (fills the form but does NOT submit)
npm run start -- --url https://example.com

# Detect only — find the contact page and form, do nothing else
npm run start -- --url https://example.com --mode detect-only

# Live submission — only on authorized sites
npm run start -- --url https://example.com --mode live

# Batch from a file, write results to JSON
npm run start -- --file sites.txt --output results.json --json-pretty
```

**Options**

```
--url <url>          Single URL to test
--file <path>        .txt or .csv with one URL per line
--mode <mode>        live | safe | detect-only   (default: safe)
--landing-page       Detect the form on the given URL (skip contact-page discovery)
--headed             Show the browser window
--output <path>      Write results to a JSON file
--json-pretty        Pretty-print JSON
--timeout <ms>       Per-action timeout (default: 15000)
--concurrency <n>    Batch concurrency (default: 2)
--email <email>      Override the test email address
```

</details>

<details>
<summary><strong>Change monitoring</strong></summary>

```bash
# Take a baseline snapshot
npm run start -- --url https://yoursite.com --monitor snapshot

# Later, compare current state against the most recent snapshot
npm run start -- --url https://yoursite.com --monitor compare --json-pretty

# Or run on a schedule until Ctrl+C
npm run start -- --url https://yoursite.com --monitor watch --watch-interval 3600000
```

**Options**

```
--monitor <mode>       snapshot | compare | watch
--pages <n>            max pages to crawl (default: 10)
--screenshots          capture full-page screenshots
--watch-interval <ms>  interval for watch mode (default: 3600000 = 1 hour)
--output <file>        also write the JSON report to a file
--json-pretty          pretty-print JSON
```

</details>

---

## Reference

<details>
<summary><strong>Form test result — reason codes</strong></summary>

| Code | Meaning |
|------|---------|
| `CONTACT_PAGE_NOT_FOUND` | No contact page candidate found |
| `CONTACT_PAGE_AMBIGUOUS` | Multiple candidates, low confidence |
| `FORM_NOT_FOUND` | No form of any kind on the page |
| `NON_CONTACT_FORM_FOUND` | A form exists but didn't score as a contact form |
| `THIRD_PARTY_EMBED_FORM` | A hosted embed is present — exists, not auto-testable |
| `FORM_AMBIGUOUS` | Multiple forms, low confidence |
| `CAPTCHA_DETECTED` | CAPTCHA widget found — aborted |
| `ANTI_BOT_DETECTED` | Anti-bot challenge page — aborted |
| `REQUIRED_FIELDS_UNSUPPORTED` | Could not fill required fields |
| `SAFE_MODE_NO_SUBMIT` | Safe mode — filled but not submitted |
| `DETECT_ONLY` | Detect-only mode — no interaction |
| `SUBMIT_FAILED` | Submit click failed |
| `VALIDATION_ERROR` | Form showed validation errors |
| `NO_REDIRECT_NO_SUCCESS` | Submitted but no success signal |
| `INLINE_SUCCESS_ONLY` | Inline success message detected |
| `THANK_YOU_REDIRECT` | Redirected to a thank-you URL |
| `PASS` | Full success |
| `ERROR` | Unhandled exception |

**Final status** rolls these up into `pass` · `warn` · `fail` · `error`.

</details>

<details>
<summary><strong>Change severity tiers</strong></summary>

| Severity | Meaning |
|----------|---------|
| `low` | Cosmetic — meta description, minor text edits, script noise, load time |
| `medium` | Likely intentional — title/H1 changed, CTA text changed, page added |
| `high` | Material — form field added/removed, page disappeared, robots meta changed |

</details>

---

## Contributing

1. Branch off `main`.
2. Make your change; keep the engine and the web app type-clean (`npm run lint` in each) and green — the engine unit tests (`npm test` at the root) **and** the web app's end-to-end tests (`npm run test:e2e` in `ui/`) must pass before you commit.
3. Open a pull request describing what changed and why.

**CI runs on every push and PR** (GitHub Actions): the engine's typecheck + unit tests and the web app's typecheck + Playwright e2e must all be green before merge.

The codebase leans on a shared component kit and a single set of design tokens for the UI, and deterministic, well-tested heuristics in the engine — please match the surrounding style rather than introducing parallel patterns.

---

## Responsible use

FormPing is for **authorized testing only**.

- Use it only on sites you own, operate, or have written permission to test.
- Never target third-party sites without permission, and never use it to spam or flood forms.
- In live mode, submissions send **real** messages — use a test address you control.

It deliberately cannot bypass CAPTCHA or anti-bot protections, doesn't handle file-upload fields, and may miss forms that use unusual, non-standard submit mechanisms.
