export type SubmitMode = 'live' | 'safe' | 'detect-only';

// ─── AI provider types ──────────────────────────────────────────────────────

export type AiProviderId = 'anthropic' | 'gemini' | 'groq' | 'ollama';
export type AiProviderSelection = 'off' | 'auto' | AiProviderId;

export interface AiProviderInfo {
  id: AiProviderId;
  label: string;
  modelLabel: string;
  configured: boolean;
  available: boolean;
  setupHint: string;
}

export interface AiProvidersResponse {
  providers: AiProviderInfo[];
  fallback: AiProviderId | null;
}
export type FinalStatus = 'pass' | 'fail' | 'warn' | 'error';

export interface FormIdentifier {
  id: string | null;
  name: string | null;
  action: string | null;
  method: string | null;
}

/** A single detected field (label + input type) — for "Name, Email, Message". FR-64. */
export interface DetectedFormField {
  label: string;
  type: string;
  /** Field name — collapses radio/checkbox groups for accurate counts. FR-68. */
  name?: string;
}

/** What a form looks like it's for — for describing multi-form pages. FR-68. */
export type FormKind = 'contact' | 'newsletter' | 'search' | 'login' | 'other';

/** Roughly where a form sits on the page — "in the footer" / "under 'Subscribe'". FR-68. */
export interface FormLocation {
  landmark?: string;
  heading?: string;
  anchorId?: string;
}

/** One of the OTHER forms on the page (not the one we tested). FR-68. */
export interface FormBrief {
  kind: FormKind | 'third-party';
  identifier: FormIdentifier | null;
  provider?: string;
  fieldCount?: number;
  location?: FormLocation;
}

/** Hidden tracking/UTM params a form captures — campaign attribution. FR-68. */
export interface TrackingParams {
  utm: string[];
  other: string[];
}

/** What we did with a detected lead form (we now fill every lead form). FR-76. */
export interface FormOutcome {
  state: 'detected' | 'filled' | 'submitted' | 'skipped' | 'failed';
  filledCount?: number;
  note?: string;
}

/** One form found anywhere on the site (site-level crawl). FR-68. */
export interface SiteForm {
  url: string;
  kind: FormKind | 'third-party';
  about: string;
  formType: 'native' | 'third-party';
  provider?: string;
  fieldCount: number;
  fields: DetectedFormField[];
  security: { captcha: boolean };
  tracking: TrackingParams;
  siteWide: boolean;
  seenOn: number;
  /** What we did with it this run — fill every lead form, detect the rest. FR-76. */
  outcome?: FormOutcome;
}

/** "This page has N forms" — present only when the page has 2+ forms. FR-68. */
export interface FormsOnPage {
  total: number;
  native: number;
  embeds: number;
  tested: { kind: FormKind; identifier: FormIdentifier | null } | null;
  others: FormBrief[];
  multipleContacts: boolean;
}

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
  submissionResult: string;
  redirectUrl: string | null;
  finalUrl: string | null;
  thankYouDetected: boolean;
  inlineSuccessDetected: boolean;
  captchaDetected: boolean;
  antiBotDetected: boolean;
  finalStatus: FinalStatus;
  reasonCode: string;
  notes: string[];
  errors: string[];
  durationMs: number;
  error?: string;

  // ── Detected-form facts (FR-64) — see engine src/types.ts SiteResult ────────
  formType?: 'native' | 'third-party';
  embedProvider?: string | null;
  embedKind?: 'iframe' | 'script' | 'container' | null;
  fieldCount?: number;
  fields?: DetectedFormField[];
  isMultiStep?: boolean;
  landingPageMode?: boolean;
  /** How many forms are on the tested page + what the others are (2+ only). FR-68. */
  formsOnPage?: FormsOnPage;
  /** Hidden tracking/UTM params the tested form captures. FR-68. */
  tracking?: TrackingParams;
  /** Every form found across the site (whole-site crawl). FR-68. */
  siteForms?: SiteForm[];
}

export interface RunConfig {
  mode: SubmitMode;
  email: string;
  timeout: number;
  headed: boolean;
  /** AI provider for ambiguity disambiguation in form-tester */
  aiProvider: AiProviderSelection;
  concurrency: number;
  /** Retry BLOCKED_BY_HOST sites once via Browserbase residential IP. Costs money per retry. */
  residentialFallback: boolean;
  /** Landing-page mode: test the form on the exact URL, skipping contact-page discovery. */
  landingPage: boolean;
}

export type SSEEvent =
  | { type: 'progress'; url: string; index: number; total: number }
  | { type: 'result'; result: SiteResult }
  | { type: 'log'; message: string }
  | { type: 'done'; exitCode: number | null }
  | { type: 'error'; message: string };

export interface RunProgress {
  current: number;
  total: number;
  currentUrl: string;
}

// ─── Monitor types ──────────────────────────────────────────────────────────

export type MonitorMode = 'snapshot' | 'compare' | 'watch';
export type ChangeSeverity = 'low' | 'medium' | 'high';

export type TextChangeType = 'added' | 'removed' | 'edited';
export type TextChangeKind = 'heading' | 'paragraph' | 'listItem' | 'other';

export interface TextLocation {
  section?: string;
  heading?: string;
  selector?: string;
  tag?: string;
}

export interface TextChange {
  type: TextChangeType;
  kind: TextChangeKind;
  before?: string;
  after?: string;
  meta?: string;
  location?: TextLocation;
}

export interface PageChange {
  url: string;
  changes: string[];
  textChanges?: TextChange[];
  severity: ChangeSeverity;
}

export interface PageHashStatus {
  url: string;
  hashChanged: boolean;
  oldLength: number;
  newLength: number;
}

export interface ChangeReport {
  site: string;
  rootUrl: string;
  checkedAt: string;
  previousSnapshot: string | null;
  pagesScanned: number;
  pagesChanged: number;
  changesFound: number;
  summary: string;
  /** Model label that produced the summary (e.g. "Gemini 2.5 Flash") */
  summaryProvider?: string;
  details: PageChange[];
  hashStatus?: PageHashStatus[];
}

export interface SnapshotResult {
  /**
   * Absolute path of the snapshot file on the SERVER. Optional because the UI no
   * longer displays it (it's a path inside the container — meaningless to a user)
   * and because a result rehydrated after a page reload comes from the change
   * event, which doesn't carry the path. Live runs still emit it.
   */
  snapshotPath?: string;
  site: string;
  pagesScanned: number;
}

export interface MonitorConfig {
  monitorMode: MonitorMode;
  maxPages: number;
  takeScreenshots: boolean;
  /** AI provider for the change-summary call */
  aiProvider: AiProviderSelection;
  watchIntervalMs: number;
}

export type MonitorSSEEvent =
  | { type: 'log'; message: string }
  | { type: 'snapshot'; result: SnapshotResult }
  | { type: 'report'; report: ChangeReport }
  | { type: 'done'; exitCode: number | null }
  | { type: 'error'; message: string };
