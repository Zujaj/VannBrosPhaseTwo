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
/** Node-side attempts per request. The link to Google flakes, it is not down. */
const ATTEMPTS = 3;
const ATTEMPT_TIMEOUT_MS = 20_000;

interface CachedResponse {
  status: number;
  headers: Record<string, string>;
  body: Buffer;
}

/**
 * Successful GETs, per worker process. The Maps script and its versioned modules are identical
 * on every navigation, so a worker fetches each once. Measured 2026-09-27: from this network
 * 2 in 5 fetches of the Maps script died with a TLS error after ~10s, and a suite that loads
 * `/maps` in every test drew that on most runs, painting a blank page.
 */
const cache = new Map<string, CachedResponse>();

export async function routeGoogleMapsViaNode(context: BrowserContext): Promise<void> {
  await context.route(GOOGLE_MAPS, async (route) => {
    const request = route.request();
    const cacheable = request.method() === 'GET';
    const hit = cacheable ? cache.get(request.url()) : undefined;
    if (hit) {
      await route.fulfill(hit).catch(() => {});
      return;
    }
    for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
      try {
        const response = await route.fetch({ timeout: ATTEMPT_TIMEOUT_MS });
        if (cacheable && response.status() === 200) {
          cache.set(request.url(), {
            status: 200,
            headers: response.headers(),
            body: await response.body(),
          });
        }
        await route.fulfill({ response });
        return;
      } catch {
        // Retry; after the last attempt fall through to the abort below.
      }
    }
    // Node's fetch failed every time, or the context closed mid-request. Abort rather than
    // leave the request pending: a failed script lets the page finish loading and fail visibly.
    await route.abort().catch(() => {});
  });
}
