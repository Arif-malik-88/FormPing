import type { Config } from 'tailwindcss';

/** Semantic colour token backed by a CSS variable (see globals.css `:root`).
 *  The `<alpha-value>` placeholder lets utilities take an opacity, e.g. `bg-panel/60`. */
const token = (v: string) => `rgb(var(${v}) / <alpha-value>)`;

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // ── Design-system colour tokens (FR-35) ───────────────────────────────────
      // Single source of truth = the CSS vars in globals.css. New/redesigned
      // surfaces use these semantic names (bg-panel, text-ink-muted, text-accent,
      // border-line, text-ok…) instead of raw slate-/indigo- classes, so the whole
      // app — internal and external — stays colour-consistent. Additive: existing
      // slate-/indigo- utilities are untouched.
      colors: {
        ground: token('--fp-ground'),
        rail: token('--fp-rail'),
        panel: {
          DEFAULT: token('--fp-panel'),
          raised: token('--fp-panel-raised'),
        },
        line: {
          DEFAULT: token('--fp-line'),
          strong: token('--fp-line-strong'),
        },
        ink: {
          DEFAULT: token('--fp-ink'),
          secondary: token('--fp-ink-secondary'),
          muted: token('--fp-ink-muted'),
          faint: token('--fp-ink-faint'),
        },
        accent: {
          DEFAULT: token('--fp-accent'),
          strong: token('--fp-accent-strong'),
          deep: token('--fp-accent-deep'),
          soft: token('--fp-accent-soft'),
        },
        ping: token('--fp-ping'),
        // Canonical status palette — one green/amber/rose/slate meaning everywhere.
        ok: token('--fp-ok'),
        warn: token('--fp-warn'),
        danger: token('--fp-danger'),
        idle: token('--fp-idle'),
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'ui-monospace', 'monospace'],
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slideIn 0.2s ease-out',
        'fade-in': 'fadeIn 0.15s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(-6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
