'use client';

/**
 * Design system preview (FR-35) — the living style guide + palette reference.
 *
 * Internal-only (middleware-gated like every non-public route). This is the review
 * surface for the redesign and the canonical reference for the tokens, the unified
 * status vocabulary, and the component kit. It renders nothing but the primitives
 * themselves — no app data — so it's safe and self-contained.
 */

import { useState } from 'react';
import { palette } from '@/lib/design/tokens';
import { STATUS, type StatusLevel } from '@/lib/design/status';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Skeleton,
  StatusDot,
  StatusPill,
  StatusText,
  Tabs,
  Textarea,
} from '@/components/ui';

// ── Palette groups (for the swatch board) ────────────────────────────────────
const SURFACES: Array<[string, string]> = [
  ['ground', palette.ground],
  ['rail', palette.rail],
  ['panel', palette.panel],
  ['panel-raised', palette.panelRaised],
  ['line', palette.line],
  ['line-strong', palette.lineStrong],
];
const INK: Array<[string, string]> = [
  ['ink', palette.ink],
  ['ink-secondary', palette.inkSecondary],
  ['ink-muted', palette.inkMuted],
  ['ink-faint', palette.inkFaint],
];
const ACCENT: Array<[string, string]> = [
  ['accent', palette.accent],
  ['accent-strong', palette.accentStrong],
  ['accent-deep', palette.accentDeep],
  ['accent-soft', palette.accentSoft],
];
const STATUS_SWATCHES: Array<[string, string]> = [
  ['ok', palette.ok],
  ['warn', palette.warn],
  ['danger', palette.danger],
  ['idle', palette.idle],
];

const LEVELS: Array<{ level: StatusLevel; word: string; means: string }> = [
  { level: 'ok', word: 'Operational', means: 'healthy · up · monitoring' },
  { level: 'warn', word: 'Attention', means: 'degraded · blocked · needs a look' },
  { level: 'danger', word: 'Failing', means: 'down · critical' },
  { level: 'idle', word: 'Idle', means: 'not monitored · pending · unknown' },
];

function Swatch({ name, hex }: { name: string; hex: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-panel">
      <div className="h-14 w-full" style={{ backgroundColor: hex }} />
      <div className="px-2.5 py-2">
        <div className="text-[11px] font-semibold text-ink">{name}</div>
        <div className="font-mono text-[10px] uppercase text-ink-faint">{hex}</div>
      </div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-ink-faint">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  const [tab, setTab] = useState<'overview' | 'components'>('overview');
  const [modal, setModal] = useState(false);

  return (
    <main className="mx-auto max-w-5xl space-y-10 px-4 py-8">
      <PageHeader
        title="Design system"
        description="The single source of truth for FormPing's redesign — colour tokens, the unified status vocabulary, and the shared component kit. Every redesigned page is built from these."
        actions={<Badge tone="accent" uppercase>FR-35</Badge>}
      />

      <Tabs
        items={[
          { value: 'overview', label: 'Foundations' },
          { value: 'components', label: 'Components' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'overview' ? (
        <div className="space-y-10">
          <Section title="Surfaces & lines" hint="Backgrounds and borders, darkest to lightest.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {SURFACES.map(([n, h]) => (
                <Swatch key={n} name={n} hex={h} />
              ))}
            </div>
          </Section>

          <Section title="Text" hint="text-ink → text-ink-faint. Primary reads brightest; faint for metadata.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {INK.map(([n, h]) => (
                <Swatch key={n} name={n} hex={h} />
              ))}
            </div>
          </Section>

          <Section title="Accent — indigo" hint="Interactive & active states only. Never used to signal status.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {ACCENT.map(([n, h]) => (
                <Swatch key={n} name={n} hex={h} />
              ))}
            </div>
          </Section>

          <Section title="Brand ping — orange" hint="LOGO ONLY. Never a UI or status colour.">
            <div className="flex items-center gap-4 rounded-lg border border-line bg-panel p-4">
              <span className="h-12 w-12 rounded-xl" style={{ backgroundColor: palette.ping }} />
              <div>
                <div className="text-[11px] font-semibold text-ink">ping</div>
                <div className="font-mono text-[10px] uppercase text-ink-faint">{palette.ping}</div>
                <div className="mt-1 text-[11px] text-ink-muted">Reserved for the FormPing mark.</div>
              </div>
            </div>
          </Section>

          <Section
            title="Status vocabulary"
            hint="ONE language everywhere. Form Watch and Site Watch values map into these four levels, so a colour means the same thing on every screen."
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {STATUS_SWATCHES.map(([n, h]) => (
                <Swatch key={n} name={n} hex={h} />
              ))}
            </div>
            <Card>
              <CardBody className="space-y-3">
                {LEVELS.map(({ level, word, means }) => (
                  <div key={level} className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <div className="w-28">
                      <StatusPill level={level}>{word}</StatusPill>
                    </div>
                    <StatusText level={level} pulse>
                      {word}
                    </StatusText>
                    <span className="inline-flex items-center gap-2">
                      <StatusDot level={level} />
                      <span className="text-[11px] text-ink-faint">{STATUS[level].dot}</span>
                    </span>
                    <span className="ml-auto text-[11px] text-ink-muted">{means}</span>
                  </div>
                ))}
              </CardBody>
            </Card>
          </Section>
        </div>
      ) : (
        <div className="space-y-10">
          <Section title="Buttons" hint="One primitive, four variants, two sizes.">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Delete</Button>
              <Button variant="primary" disabled>
                Disabled
              </Button>
              <Button variant="secondary" size="sm">
                Small
              </Button>
            </div>
          </Section>

          <Section title="Badges" hint="Non-status labels: roles, counts, tags.">
            <div className="flex flex-wrap items-center gap-3">
              <Badge>Neutral</Badge>
              <Badge tone="accent" uppercase>
                Admin
              </Badge>
              <Badge tone="outline">Outline</Badge>
            </div>
          </Section>

          <Section title="Cards">
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader title="Acme Corp" subtitle="acme.com · 5 URLs" actions={<StatusPill level="ok">Monitoring</StatusPill>} />
                <CardBody className="text-sm text-ink-muted">Standard card with a header and body.</CardBody>
              </Card>
              <Card interactive muted>
                <CardHeader title="Paused client" subtitle="example.com · 2 URLs" actions={<StatusPill level="idle">Not monitoring</StatusPill>} />
                <CardBody className="text-sm text-ink-muted">Muted + interactive (hover to lift).</CardBody>
              </Card>
            </div>
          </Section>

          <Section title="Form controls">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Project name" htmlFor="d-name" hint="Shown across the app.">
                <Input id="d-name" placeholder="Acme Corp" />
              </Field>
              <Field label="Notify" htmlFor="d-sel" hint="Where alerts go.">
                <Select id="d-sel" defaultValue="slack">
                  <option value="slack">Slack</option>
                  <option value="email">Email</option>
                </Select>
              </Field>
              <Field label="With an error" htmlFor="d-err" error="This field is required.">
                <Input id="d-err" placeholder="Something's off" />
              </Field>
              <Field label="Notes" htmlFor="d-notes">
                <Textarea id="d-notes" placeholder="Anything worth remembering…" />
              </Field>
            </div>
          </Section>

          <Section title="Overlays & states">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" onClick={() => setModal(true)}>
                Open modal
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <EmptyState
                icon={
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
                    <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
                  </svg>
                }
                title="No projects yet"
                description="Create your first project to group a client's URLs and start monitoring."
                action={<Button variant="primary" size="sm">New project</Button>}
              />
              <div className="space-y-2 rounded-xl border border-line bg-panel/70 p-4">
                <div className="text-xs font-semibold text-ink-faint">Loading skeletons</div>
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          </Section>
        </div>
      )}

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Modal title"
        subtitle="The generic dialog shell from the kit."
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setModal(false)}>
              Confirm
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-muted">
          Escape or click the backdrop to dismiss. Body scroll locks while it&apos;s open.
        </p>
      </Modal>
    </main>
  );
}
