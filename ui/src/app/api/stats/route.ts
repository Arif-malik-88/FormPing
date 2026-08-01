import { NextResponse } from 'next/server';
import { supabaseAdmin, supabaseEnabled } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/stats — public aggregate volume counts for the landing page (FR-29).
 *
 * PUBLIC (allow-listed in middleware): it powers the /welcome count-up, which
 * anyone can see before login. It returns ONLY row counts — never any client,
 * URL, or result data — and deliberately excludes anything that would reveal how
 * many clients/sites Apexure monitors. Counts are cheap `head` queries.
 */
async function countOf(table: string): Promise<number> {
  const { count, error } = await supabaseAdmin().from(table).select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

export async function GET() {
  const empty = { formsTested: 0, siteChecks: 0, alerts: 0 };
  if (!supabaseEnabled()) return NextResponse.json(empty);
  try {
    const [tester, formWatch, siteWatch, alerts] = await Promise.all([
      countOf('form_tester_runs'),
      countOf('form_watch_runs'),
      countOf('site_watch_runs'),
      countOf('alerts'),
    ]);
    return NextResponse.json({
      formsTested: tester + formWatch,
      siteChecks: siteWatch,
      alerts,
    });
  } catch {
    // Never break the landing page on a stats hiccup — fall back to zeros.
    return NextResponse.json(empty);
  }
}
