import type { ChangeSeverity } from '@/types';

const STYLES: Record<ChangeSeverity, string> = {
  high: 'bg-danger/15 text-danger ring-1 ring-danger/30',
  medium: 'bg-warn/15 text-warn ring-1 ring-warn/30',
  low: 'bg-idle/15 text-ink-muted ring-1 ring-idle/30',
};

const DOT: Record<ChangeSeverity, string> = {
  high: 'bg-danger',
  medium: 'bg-warn',
  low: 'bg-idle',
};

export function SeverityBadge({ severity }: { severity: ChangeSeverity }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold tracking-wide uppercase ${STYLES[severity]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${DOT[severity]}`} />
      {severity}
    </span>
  );
}
