// ─── Enums & Union Types ────────────────────────────────────────────────────

export type SubmitMode = 'live' | 'safe' | 'detect-only';

export type FinalStatus = 'pass' | 'fail' | 'warn' | 'error';

export type ReasonCode =
  | 'CONTACT_PAGE_NOT_FOUND'
  | 'CONTACT_PAGE_AMBIGUOUS'
  | 'FORM_NOT_FOUND'
  // A <form> exists on the page but none scored as a contact form (e.g. a
  // search/newsletter/quiz form). Distinct from FORM_NOT_FOUND (nothing at all)
  // so the user hears "found a form, but not a contact one" — FR-28.
  | 'NON_CONTACT_FORM_FOUND'
  // A known third-party embed (Typeform, HubSpot, Calendly, Jotform, Tally, …)
  // is present: the form provably exists but is a cross-origin embed we can't
  // auto-fill. Reported so the user knows it's there — FR-28.
  | 'THIRD_PARTY_EMBED_FORM'
  | 'FORM_AMBIGUOUS'
  | 'BLOCKED_BY_HOST'
  | 'CAPTCHA_DETECTED'
  | 'ANTI_BOT_DETECTED'
  | 'REQUIRED_FIELDS_UNSUPPORTED'
  // A contact form was DETECTED but it lives in a hidden multi-step widget
  // (a display:none step revealed on "Next"), so its fields aren't reachable for
  // a blind fill yet. Detected — not broken. Distinct from
  // REQUIRED_FIELDS_UNSUPPORTED (a visible form whose fields we couldn't touch)
  // so the card can say "found, multi-step" instead of "could not fill". Walking
  // the steps to fill/submit is Phase 2 (FR-63). FR-64.
  | 'MULTI_STEP_FORM_DETECTED'
  | 'SAFE_MODE_NO_SUBMIT'
  | 'DETECT_ONLY'
  | 'SUBMIT_FAILED'
  | 'SUBMISSION_BLOCKED_BY_ANTISPAM'
  | 'PROXY_REJECTED_POST'
  | 'VALIDATION_ERROR'
  | 'NO_REDIRECT_NO_SUCCESS'
  | 'INLINE_SUCCESS_ONLY'
  | 'THANK_YOU_REDIRECT'
  | 'PASS'
  | 'ERROR';

export type SubmissionResult =
  | 'not_attempted'
  | 'success'
  | 'validation_error'
  | 'captcha_blocked'
  | 'anti_bot_blocked'
  | 'submit_failed'
  | 'timeout';

// ─── Config ─────────────────────────────────────────────────────────────────

export interface AppConfig {
  mode: SubmitMode;
  headless: boolean;
  timeout: number;
  navigationTimeout: number;
  batchConcurrency: number;
  /** AI provider selection for form-tester ambiguity resolution.
   * 'off' = deterministic only; 'auto' = first configured in priority order. */
  aiProvider: 'off' | 'auto' | 'anthropic' | 'gemini' | 'groq' | 'ollama';
  /** When a site is BLOCKED_BY_HOST on the direct cloud-IP attempt, retry once
   * via Browserbase's residential-IP browser. Requires BROWSERBASE_API_KEY
   * and BROWSERBASE_PROJECT_ID env vars. Defaults to false because each
   * residential session is billed. */
  residentialFallback: boolean;
  /** "Landing page" mode. When true, skip contact-page discovery and run form
   * detection DIRECTLY on the given URL (no crawling to other pages). For
   * standalone landing pages whose form is inline and which have no separate
   * /contact page. Defaults to false — normal discovery behaviour. */
  landingPage: boolean;
  saveScreenshotOnFailure: boolean;
  saveHtmlSnapshotOnFailure: boolean;
  outputFile?: string;
  prettyJson: boolean;

  testData: TestData;

  thankYouUrlPatterns: RegExp[];
  inlineSuccessPatterns: RegExp[];
  validationErrorPatterns: RegExp[];
  captchaPatterns: RegExp[];
  antiBotPatterns: RegExp[];

  contactPathPatterns: RegExp[];
  contactTextPatterns: RegExp[];
  excludePathPatterns: RegExp[];
}

export interface TestData {
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  message: string;
}

// ─── Discovery ──────────────────────────────────────────────────────────────

export interface ContactCandidate {
  url: string;
  score: number;
  signals: string[];
  pageScore?: number;
  pageSignals?: string[];
  totalScore?: number;
}

// ─── Forms ──────────────────────────────────────────────────────────────────

export interface FormIdentifier {
  id: string | null;
  name: string | null;
  action: string | null;
  method: string | null;
}

export interface FormCandidate {
  index: number;
  identifier: FormIdentifier;
  score: number;
  signals: string[];
  negativeSignals: string[];
  /** The form's detected fields (label + input type), so the caller can report
   *  "N fields: Name, Email, Message …" without re-reading the DOM. FR-64. */
  fields: DetectedFormField[];
}

/** A single field detected on a form — the bits worth showing a user. FR-64. */
export interface DetectedFormField {
  label: string;
  type: string;
}

export interface FilledField {
  label: string;
  type: string;
  value: string;
}

// ─── Results ────────────────────────────────────────────────────────────────

export interface SiteResult {
  inputUrl: string;
  normalizedUrl: string;
  mode: SubmitMode;
  resolvedContactPage: string | null;
  contactPageFound: boolean;
  contactPageConfidence: number;
  formFound: boolean;
  formConfidence: number;
  formIdentifier: FormIdentifier | null;
  submissionAttempted: boolean;
  submissionResult: SubmissionResult;
  redirectUrl: string | null;
  finalUrl: string | null;
  thankYouDetected: boolean;
  inlineSuccessDetected: boolean;
  captchaDetected: boolean;
  antiBotDetected: boolean;
  finalStatus: FinalStatus;
  reasonCode: ReasonCode;
  notes: string[];
  errors: string[];
  durationMs: number;
  error?: string;

  // ── Detected-form facts (FR-64) ────────────────────────────────────────────
  // Populated whenever a form (native or third-party) is present on the tested
  // page, so the result card can describe what was found instead of a bare
  // "detected". All optional — absent on discovery failures / error results.
  /** Whether the form we found is a hand-coded DOM form or a hosted embed. */
  formType?: 'native' | 'third-party';
  /** Provider of a third-party embed, e.g. "Typeform" (only when third-party). */
  embedProvider?: string | null;
  /** How a third-party embed is mounted — answers "iframe or normal DOM form". */
  embedKind?: 'iframe' | 'script' | 'container' | null;
  /** Number of fields detected on the chosen native form. */
  fieldCount?: number;
  /** The detected native fields (label + type) — for "Name, Email, Message …". */
  fields?: DetectedFormField[];
  /** True when the native form sits in a hidden multi-step widget (FR-62). */
  isMultiStep?: boolean;
  /** True when the run skipped discovery and tested the given URL directly
   *  (Landing-page mode) — the card must not show a "contact page" confidence. */
  landingPageMode?: boolean;
}
