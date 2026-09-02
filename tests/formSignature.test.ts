import { describe, it, expect } from 'vitest';
import { scoreContactFormSignature } from '../src/discovery/formSignature.js';

/**
 * FR-59 — the contact-form "signature" scorer works on RAW HTML (Cheerio, no
 * browser) and decides whether a page holds a real contact form based purely on
 * CONTENT — never the URL/slug. This is the cheap breadth pass that lets us find
 * a form on any page (/reach, /lets-talk, the homepage, …), not just /contact.
 *
 * Convention: score > 0 = looks like a contact form; score <= 0 = not one.
 */
const wrap = (inner: string) => `<html><body>${inner}</body></html>`;
const form = (inner: string) => wrap(`<form>${inner}</form>`);

describe('scoreContactFormSignature (FR-59)', () => {
  it('scores a classic contact form as positive (name + email + message + submit)', () => {
    const html = form(`
      <input name="name" placeholder="Your name">
      <input type="email" name="email">
      <textarea name="message"></textarea>
      <button type="submit">Send message</button>
    `);
    expect(scoreContactFormSignature(html).score).toBeGreaterThan(0);
  });

  it('detects the submit via intent text even without type=submit (SPA/JS case)', () => {
    const html = form(`
      <input name="fullname">
      <input type="email" name="email">
      <textarea name="msg"></textarea>
      <button type="button">Send</button>
    `);
    expect(scoreContactFormSignature(html).score).toBeGreaterThan(0);
  });

  it('is slug-independent — it never sees a URL, only content', () => {
    const html = form(`
      <input name="name"><input type="email"><textarea></textarea>
      <button type="submit">Contact us</button>
    `);
    expect(scoreContactFormSignature(html).score).toBeGreaterThan(0);
  });

  it('rejects a newsletter form (single email field)', () => {
    const html = form(`<input type="email" name="email"><button type="submit">Subscribe</button>`);
    expect(scoreContactFormSignature(html).score).toBeLessThanOrEqual(0);
  });

  it('rejects a search form', () => {
    const html = form(`<input type="search" name="q" placeholder="Search"><button type="submit">Search</button>`);
    expect(scoreContactFormSignature(html).score).toBeLessThanOrEqual(0);
  });

  it('rejects a login form (password field)', () => {
    const html = form(`<input name="user"><input type="password" name="pass"><button type="submit">Log in</button>`);
    expect(scoreContactFormSignature(html).score).toBeLessThanOrEqual(0);
  });

  it('matches "Send My Message" and scores a no-textarea lead form (FR-62)', () => {
    const html = form(`
      <input name="name"><input type="email"><input name="brand"><input name="website">
      <button type="submit">Send My Message</button>
    `);
    // name(15) + email(15) + submit-intent(15) = 45; proves the "Send My Message"
    // pattern matches even without a textarea.
    expect(scoreContactFormSignature(html).score).toBeGreaterThanOrEqual(40);
  });

  it('returns 0 when there is no form at all', () => {
    expect(scoreContactFormSignature(wrap('<p>Just some text, no form here.</p>')).score).toBe(0);
  });

  it('picks the best form when a page has several (nav search + real contact form)', () => {
    const html = wrap(`
      <form><input type="search" name="q"><button type="submit">Search</button></form>
      <form>
        <input name="name"><input type="email"><textarea></textarea>
        <button type="submit">Send message</button>
      </form>
    `);
    expect(scoreContactFormSignature(html).score).toBeGreaterThan(0);
  });
});
