import { describe, it, expect } from 'vitest';
import { rankByFormSignature, selectCandidateUrls } from '../src/discovery/contentDiscovery.js';

/**
 * FR-59 — given candidate pages (url + raw html), pick the one that actually
 * holds a contact form, RANKED BY CONTENT. The slug is only a small tie-breaker
 * bonus — a form on /reach or the homepage still wins over a slugged page with
 * no form. Pages with no real contact form are dropped entirely.
 */
const contactForm = `<form><input name="name"><input type="email"><textarea></textarea><button type="submit">Send message</button></form>`;
const newsletter = `<form><input type="email"><button type="submit">Subscribe</button></form>`;
const noForm = `<p>About us — nothing to submit here.</p>`;
const PATTERNS = [/\/contact(\/|$)/i];

describe('rankByFormSignature (FR-59)', () => {
  it('finds the form-bearing page regardless of slug (/reach beats homepage + /about)', () => {
    const ranked = rankByFormSignature(
      [
        { url: 'https://x.com/', html: noForm },
        { url: 'https://x.com/reach', html: contactForm },
        { url: 'https://x.com/about', html: noForm },
      ],
      PATTERNS,
    );
    expect(ranked[0]?.url).toBe('https://x.com/reach');
  });

  it('detects a contact form on the homepage itself', () => {
    const ranked = rankByFormSignature([{ url: 'https://x.com/', html: contactForm }], PATTERNS);
    expect(ranked[0]?.url).toBe('https://x.com/');
    expect(ranked[0]?.score).toBeGreaterThan(0);
  });

  it('slug hint is only a tie-breaker: /contact outranks an equal form on /reach', () => {
    const ranked = rankByFormSignature(
      [
        { url: 'https://x.com/reach', html: contactForm },
        { url: 'https://x.com/contact', html: contactForm },
      ],
      PATTERNS,
    );
    expect(ranked[0]?.url).toBe('https://x.com/contact');
  });

  it('drops pages whose only form is a newsletter/no form (precision)', () => {
    const ranked = rankByFormSignature(
      [
        { url: 'https://x.com/', html: noForm },
        { url: 'https://x.com/newsletter', html: newsletter },
      ],
      PATTERNS,
    );
    expect(ranked).toHaveLength(0);
  });

  it('returns empty when no candidate has a contact form', () => {
    expect(rankByFormSignature([{ url: 'https://x.com/', html: noForm }], PATTERNS)).toHaveLength(0);
  });
});

const OPTS = {
  excludePathPatterns: [/\/blog\//i, /\/login/i],
  contactPathPatterns: [/\/contact(\/|$)/i],
  contactTextPatterns: [/contact/i],
  cap: 5,
};

describe('selectCandidateUrls (FR-59)', () => {
  it('always includes the homepage first', () => {
    const urls = selectCandidateUrls('https://x.com/', [{ href: '/about', text: 'About' }], [], OPTS);
    expect(urls[0]).toBe('https://x.com/');
  });

  it('filters out excluded paths and off-origin links', () => {
    const urls = selectCandidateUrls(
      'https://x.com/',
      [
        { href: '/blog/post-1', text: 'Post' },
        { href: 'https://other.com/contact', text: 'Contact' },
        { href: '/contact', text: 'Contact us' },
      ],
      [],
      OPTS,
    );
    expect(urls).toContain('https://x.com/contact');
    expect(urls.some((u) => u.includes('/blog/'))).toBe(false);
    expect(urls.some((u) => u.includes('other.com'))).toBe(false);
  });

  it('dedupes and respects the cap', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ href: `/p${i}`, text: '' }));
    const urls = selectCandidateUrls('https://x.com/', many, [], { ...OPTS, cap: 5 });
    expect(urls.length).toBeLessThanOrEqual(5);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('ranks a hint-less lead page (/partner-with-me) up, not just /contact (FR-62)', () => {
    const urls = selectCandidateUrls(
      'https://x.com/',
      [
        { href: '/about', text: 'About' },
        { href: '/partner-with-me', text: 'Partner with me' },
      ],
      [],
      { ...OPTS, cap: 3 },
    );
    // homepage first, then /partner-with-me (broad lead-page hint) before /about
    expect(urls[1]).toBe('https://x.com/partner-with-me');
  });

  it('ranks contact-ish links above generic deep ones', () => {
    const urls = selectCandidateUrls(
      'https://x.com/',
      [
        { href: '/deep/page/here', text: 'Deep' },
        { href: '/contact', text: 'Contact us' },
      ],
      [],
      { ...OPTS, cap: 3 },
    );
    expect(urls[1]).toBe('https://x.com/contact');
  });
});
