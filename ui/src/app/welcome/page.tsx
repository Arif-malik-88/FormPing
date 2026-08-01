import type { Metadata } from 'next';
import WelcomeClient from './WelcomeClient';

/**
 * Public landing page (FR-29). Middleware sends unauthenticated visitors from
 * the root here, and bounces logged-in users straight back to the app. The
 * page itself is client-rendered (canvas + reveals + count-up) — this server
 * wrapper just carries the page metadata.
 */
export const metadata: Metadata = {
  title: { absolute: 'FormPing — Contact Form QA & Site Monitor' },
  description:
    'FormPing tests your clients’ contact forms, uptime, SSL, and page changes on a schedule — and pings you the moment something breaks. One dashboard, one shareable status page per client.',
};

export default function WelcomePage() {
  return <WelcomeClient />;
}
