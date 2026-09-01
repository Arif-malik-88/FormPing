import { scoreContactFormSignature } from './formSignature.js';
import { resolveHref, isSameOrigin, urlPath } from '../utils/url.js';
import { normalizeText } from '../utils/text.js';

export interface ContentCandidate {
  url: string;
  score: number;
  signals: string[];
}

/**
 * FR-59 — rank candidate pages by contact-form signature (content), with the
 * URL slug as a small tie-breaker only. Pages with no real contact form
 * (score <= 0) are dropped, so downstream detection only ever runs on a page
 * that actually holds a form — regardless of its slug.
 */
export function rankByFormSignature(
  candidates: Array<{ url: string; html: string }>,
  contactPathPatterns: RegExp[],
): ContentCandidate[] {
  return candidates
    .map(({ url, html }) => {
      const sig = scoreContactFormSignature(html);
      let score = sig.score;
      const signals = [...sig.signals];

      // Slug is a HINT, not a gate — a tiny bonus so an equal form on /contact
      // edges out one on /reach, but a real form always beats an empty slug page.
      let path = '';
      try { path = urlPath(url); } catch { /* keep empty */ }
      if (path && contactPathPatterns.some((p) => p.test(path))) {
        score += 5;
        signals.push('slug hint: contact path');
      }

      return { url, score, signals };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);
}

export interface SelectOpts {
  excludePathPatterns: RegExp[];
  contactPathPatterns: RegExp[];
  contactTextPatterns: RegExp[];
  cap: number;
}

/**
 * FR-59 — choose which pages the content-discovery fallback should fetch: the
 * homepage (always — catches homepage-only forms) plus same-origin nav/footer
 * links and sitemap URLs, minus `excludePathPatterns`, deduped by path, and
 * capped. Contact-ish links (slug/anchor hint) and shallow pages rank first so
 * the cap keeps the most promising candidates.
 */
export function selectCandidateUrls(
  homepageUrl: string,
  links: Array<{ href: string; text: string }>,
  sitemapUrls: string[],
  opts: SelectOpts,
): string[] {
  const keyOf = (u: string) => {
    try { const p = new URL(u); return p.origin + p.pathname; } catch { return u; }
  };
  const seen = new Set<string>([keyOf(homepageUrl)]); // homepage handled separately
  const ranked: Array<{ url: string; rank: number }> = [];

  const consider = (rawUrl: string, hintText: string) => {
    const resolved = resolveHref(homepageUrl, rawUrl);
    if (!resolved || !isSameOrigin(resolved, homepageUrl)) return;
    const key = keyOf(resolved);
    if (seen.has(key)) return;
    const path = urlPath(resolved);
    if (opts.excludePathPatterns.some((p) => p.test(path))) return;
    seen.add(key);
    let rank = 0;
    if (opts.contactPathPatterns.some((p) => p.test(path))) rank += 3;
    if (hintText && opts.contactTextPatterns.some((p) => p.test(normalizeText(hintText)))) rank += 2;
    if (path.split('/').filter(Boolean).length <= 1) rank += 1; // shallow pages first
    ranked.push({ url: resolved, rank });
  };

  for (const l of links) consider(l.href, l.text);
  for (const s of sitemapUrls) consider(s, '');

  const others = ranked
    .sort((a, b) => b.rank - a.rank)
    .slice(0, Math.max(0, opts.cap - 1))
    .map((c) => c.url);

  return [homepageUrl, ...others];
}
