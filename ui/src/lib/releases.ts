/**
 * Curated release notes for the in-app "What's new" page (/whats-new).
 *
 * Hand-written and USER-FACING: describe what changed for the person using
 * FormPing, in plain language — what changed, why it matters, and the benefit —
 * never the engineering behind it, and never any internal / infrastructure
 * detail. Newest release first. Add a new entry at the top each time we cut a
 * version.
 */

/** One notable change in a release — a short title plus a paragraph of detail. */
export interface ReleaseChange {
  title: string;
  detail: string;
}

export interface Release {
  /** Semantic version, e.g. "2.0.0". */
  version: string;
  /** Short release name shown as the heading. */
  name: string;
  /** Human date, e.g. "August 2026". */
  date: string;
  /** Highlighted with a "Major update" chip when true. */
  major?: boolean;
  /** One-line summary. */
  summary: string;
  /** The notable changes, most important first. */
  changes: ReleaseChange[];
}

export const RELEASES: Release[] = [
  {
    version: '2.0.0',
    name: 'App redesign',
    date: 'August 2026',
    major: true,
    summary:
      'A top-to-bottom redesign — a cleaner, calmer FormPing that finally feels like one polished product.',
    changes: [
      {
        title: 'A cleaner, unified look',
        detail:
          'Over time the app had drifted — slightly different colours, spacing and controls on each screen, which made it feel busier than it needed to. We rebuilt everything on one shared design, with a tidy left sidebar for getting around. Now once you learn one screen you know them all, so you spend less time hunting for things and more time getting work done.',
      },
      {
        title: 'Health you can read at a glance',
        detail:
          'We used to describe status a little differently in different places, which made it easy to misread how a client was doing. There is now a single, consistent language — green is healthy, amber means keep an eye on it, red needs attention, and grey means it is not being monitored — used identically everywhere. You can scan a whole client’s health in a second, with nothing to interpret.',
      },
      {
        title: 'Rebuilt, focused tools',
        detail:
          'Projects, Contact Forms (Tester and Scheduler), Site Health (Uptime & SSL and Content Changes) and the Team page were each redesigned around the job they actually do — clearer inputs, clearer results, less clutter. Each tab now behaves like a purpose-built tool rather than a generic form, so everyday tasks are quicker and it is obvious what an action will do before you click it.',
      },
      {
        title: 'Clearer client status pages',
        detail:
          'The status page you share is the face of your monitoring, so we made it calmer and easier to read. It shows exactly what a client cares about — is my site up, is my form working, is my certificate valid — and deliberately hides anything technical. That keeps clients reassured rather than confused, and makes the work you do visible without you having to explain it.',
      },
      {
        title: 'Smarter dashboards',
        detail:
          'A page’s dashboard used to stay empty until a scheduled monitor was running, so a quick one-off test could look like “nothing here yet.” Now your results appear as soon as you have them — from a single manual test, a stopped monitor’s last check, or a live one — so you get the full picture immediately, without setting up a schedule first.',
      },
      {
        title: 'Friendlier wording throughout',
        detail:
          'We went through the whole app and rewrote technical or ambiguous wording in plain English — buttons, hints, empty states, confirmations and error messages. Anyone on the team, or a client you invite, can understand what is happening and what a button will do, without needing a technical background.',
      },
    ],
  },
  {
    version: '1.0.0',
    name: 'The first FormPing',
    date: '2026',
    major: true,
    summary:
      'The very first version — contact-form testing and website monitoring for agencies, together in one place.',
    changes: [
      {
        title: 'Contact-form testing',
        detail:
          'A broken contact form is invisible — the page still looks fine, but leads quietly stop arriving. FormPing checks the form the way a real visitor would, on demand or on a schedule, and tells you the moment it stops working, so you find out before your client does.',
      },
      {
        title: 'Uptime, SSL & domain monitoring',
        detail:
          'Sites go down, certificates expire and domains lapse — usually at the worst possible time. FormPing keeps watch and warns you early, well before a certificate or domain runs out, so a small issue never turns into an emergency (or an awkward call from the client).',
      },
      {
        title: 'Content-change tracking',
        detail:
          'Sometimes a “small tweak” quietly breaks a page or its SEO. FormPing snapshots your clients’ key pages and shows you what actually changed over time — content, SEO, forms and scripts — so nothing slips by unnoticed.',
      },
      {
        title: 'Projects & shareable status pages',
        detail:
          'Everything is organised by client, so all of a client’s URLs and monitors live in one place instead of scattered around. And you can hand each client a clean, live status page — no login needed — that reassures them their site is being looked after.',
      },
      {
        title: 'Team roles',
        detail:
          'Give each person exactly the access they need — from full control down to read-only — so the right people can make changes while everyone else can still see what is going on, safely.',
      },
    ],
  },
];
