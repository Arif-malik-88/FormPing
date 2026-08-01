import type { Metadata } from 'next';
import DocsContent from './DocsContent';

/**
 * Public documentation / knowledge center (FR-33). Reachable without login
 * (allow-listed in middleware); product docs only — no infra/ops/secrets.
 * This server wrapper carries the page metadata; the client component renders
 * the knowledge center (grouped nav + scroll-spy).
 */
export const metadata: Metadata = {
  title: { absolute: 'FormPing Docs — how it works & how to use it' },
  description:
    'What FormPing is, why to use it, and how to use every part: contact-form testing, uptime & SSL, content-change monitoring, projects, and shareable client status pages.',
};

export default function DocsPage() {
  return <DocsContent />;
}
