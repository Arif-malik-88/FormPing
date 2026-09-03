/**
 * Design tokens — JS mirror of the canonical palette (FR-35).
 *
 * The authoritative colour source is the CSS variables in `globals.css`; Tailwind
 * reads those for class-based styling. THIS file exists only for the handful of
 * places that need a raw colour value in JavaScript — SVG gradients, `<meta>`
 * theme-color, canvas — where a Tailwind class can't reach. Keep the two in sync:
 * every hex here has a matching `--fp-*` var.
 *
 * Rules: `accent` (indigo) is interactive, never a status. `ping` (orange) is the
 * LOGO ONLY — never a UI or status colour. Status = the ok/warn/danger/idle set.
 */
export const palette = {
  ground: '#020617',
  rail: '#0a0f1e',
  panel: '#0f172a',
  panelRaised: '#111a2e',

  line: '#1e293b',
  lineStrong: '#334155',

  ink: '#f1f5f9',
  inkSecondary: '#cbd5e1',
  inkMuted: '#94a3b8',
  inkFaint: '#64748b',

  accent: '#6366f1',
  accentStrong: '#4f46e5',
  accentDeep: '#4338ca',
  accentSoft: '#a5b4fc',

  ping: '#ff6a2b',

  ok: '#34d399',
  warn: '#fbbf24',
  danger: '#ef4444',
  idle: '#64748b',
  info: '#38bdf8',
} as const;

export type PaletteKey = keyof typeof palette;
