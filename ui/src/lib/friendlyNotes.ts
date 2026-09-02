/**
 * FR-64 — keep run logs readable across the Form Tester + Form Scheduler.
 *
 * The engine emits some developer-internal notes (detector scores, signal
 * lists, byte / form-tag counts, candidate tallies) that are confusing on a
 * user-facing card. Filter those out; the plain outcome is already carried by
 * the reason banner / verdict + the "what we found" summary. Also cleans legacy
 * stored runs, whose records still hold the verbose strings.
 */
const NOTE_NOISE = [
  /\bscore\s+-?\d/i,       // "score 45"
  /signals?:/i,           // "signals: name field, email field, …"
  /\d+\s?B\b/i,           // byte counts, e.g. "1234B"
  /<form>?\s*tags?|form tags/i, // "0 <form> tags in HTML"
  /candidate\(s\)/i,      // "Tried 8 candidate(s)"
  /^filled\s+\d+\s+field/i,  // "Filled 3 field(s): …" — the count is already shown
  /^skipped\s+\d+\s+field/i, // "Skipped 11 field(s): radio:… " — internal + noisy
];

export function friendlyNotes(notes: string[]): string[] {
  return notes.filter((n) => !NOTE_NOISE.some((re) => re.test(n)));
}
