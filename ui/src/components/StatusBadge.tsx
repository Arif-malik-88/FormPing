import type { FinalStatus } from '@/types';

const STYLES: Record<FinalStatus, string> = {
  pass: 'bg-ok/15 text-ok ring-1 ring-ok/30',
  fail: 'bg-danger/15 text-danger ring-1 ring-danger/30',
  warn: 'bg-warn/15 text-warn ring-1 ring-warn/30',
  error: 'bg-idle/15 text-ink-muted ring-1 ring-idle/30',
};

const DOT: Record<FinalStatus, string> = {
  pass: 'bg-ok',
  fail: 'bg-danger',
  warn: 'bg-warn',
  error: 'bg-idle',
};

export function StatusBadge({ status }: { status: FinalStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold tracking-wide uppercase ${STYLES[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${DOT[status]}`} />
      {status}
    </span>
  );
}

export function ReasonCodeBadge({ code }: { code: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-ground text-ink-secondary ring-1 ring-line-strong">
      {code}
    </span>
  );
}
