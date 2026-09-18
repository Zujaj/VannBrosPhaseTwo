import type { BrowserContext } from '@playwright/test';

/** Google Maps JS API and its static assets — what index.html's blocking `<script>` pulls in. */
const GOOGLE_MAPS = /^https:\/\/maps\.(googleapis|gstatic)\.com\//;

/**
 * Serve Google Maps through Playwright's Node-side HTTP client instead of the browser's.
 *
 * `index.html` loads the Maps JS API as a synchronous `<script>` in `<head>`. On some machines
 * that one request never completes inside the browser — Chromium and Firefox alike — while Node
 * fetches it in seconds. Because the script blocks parsing, every navigation then hangs at
 * `domcontentloaded`, the auth probe included, and nothing in the suite can run. Fulfilling the
 * request from `route.fetch()` still hands the app the real script; only the transport changes.
 * Verified 2026-09-11; see test-plans/FINDINGS.md §25.
 *
 * Call it on every context before its first navigation: the page fixtures, the auth probe and
 * the sign-in bootstrap each create their own.
 */
export async function routeGoogleMapsViaNode(context: BrowserContext): Promise<void> {
  await context.route(GOOGLE_MAPS, async (route) => {
    try {
      await route.fulfill({ response: await route.fetch() });
    } catch {
      // Node's fetch failed too, or the context closed mid-request. Abort rather than leave the
      // request pending: a failed script lets the page finish loading and fail visibly.
      await route.abort().catch(() => {});
    }
  });
}
