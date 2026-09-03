/**
 * FR-60 — a detected third-party embed is its OWN "detected" state: never amber
 * "attention" (nothing is wrong) and never green "healthy" (we didn't test a
 * submit). These pin the classification across the verdict, regression and
 * project-rollup logic so it can't silently slip back into the attention bucket.
 *
 * The functions under test are pure (relative imports only), so the engine's
 * Vitest run covers them without the web app's `@/` alias or server stores.
 */

import { describe, it, expect } from 'vitest';
import { runVerdict, type VerdictLevel } from '../ui/src/lib/formWatch/verdict';
import { isRegression } from '../ui/src/lib/formWatch/diff';
import { rollupFromHealth } from '../ui/src/lib/projects/rollup';
import { fromProjectRollup, fromFormLevel } from '../ui/src/lib/design/status';
import type { UrlHealth } from '../ui/src/lib/projects/types';

const formHealth = (level: UrlHealth['form']['level']): UrlHealth => ({
  url: 'https://example.com',
  form: { monitored: true, level, label: level === 'detected' ? 'Third-party form detected' : String(level) },
  site: { monitored: false },
});

describe('runVerdict — third-party embed', () => {
  it('classifies THIRD_PARTY_EMBED_FORM as its own "detected" level', () => {
    const v = runVerdict('THIRD_PARTY_EMBED_FORM', true);
    expect(v.level).toBe('detected');
    expect(v.label).toBe('Third-party form detected');
  });

  it('is neither the amber attention nor the green healthy bucket', () => {
    const level = runVerdict('THIRD_PARTY_EMBED_FORM', true).level;
    expect(level).not.toBe('attention');
    expect(level).not.toBe('healthy');
  });
});

describe('isRegression — detected sits between healthy and attention', () => {
  it('healthy → detected is NOT a regression', () => {
    expect(isRegression('healthy', 'detected')).toBe(false);
  });
  it('detected → attention IS a regression', () => {
    expect(isRegression('detected', 'attention')).toBe(true);
  });
  it('detected → failing IS a regression', () => {
    expect(isRegression('detected', 'failing')).toBe(true);
  });
  it('attention → detected is an improvement (not a regression)', () => {
    expect(isRegression('attention', 'detected' as VerdictLevel)).toBe(false);
  });
});

describe('fromFormLevel — canonical mapping', () => {
  it('maps detected to the sky "info" level', () => {
    expect(fromFormLevel('detected')).toBe('info');
  });
});

describe('rollupFromHealth + fromProjectRollup — dashboard state', () => {
  it('a lone detected embed rolls up to the blue "Detected" pill', () => {
    const r = rollupFromHealth([formHealth('detected')]);
    expect(r.hasDetected).toBe(true);
    expect(fromProjectRollup(r)).toEqual({ level: 'info', label: 'Detected' });
  });

  it('detected never inflates severity into attention', () => {
    const r = rollupFromHealth([formHealth('detected'), formHealth('healthy')]);
    expect(r.severity).toBeLessThan(15);
    expect(fromProjectRollup(r).level).toBe('info');
  });

  it('a real problem still wins the pill over a detected embed', () => {
    const r = rollupFromHealth([formHealth('detected'), formHealth('failing')]);
    expect(fromProjectRollup(r).level).toBe('danger');
  });

  it('attention on another URL wins over detected', () => {
    const r = rollupFromHealth([formHealth('detected'), formHealth('attention')]);
    expect(fromProjectRollup(r).level).toBe('warn');
  });
});
