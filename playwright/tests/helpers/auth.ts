import { existsSync, mkdirSync, readFileSync, renameSync, statSync } from 'fs-extra';
import path from 'path';
import type { Browser, BrowserContext } from '@playwright/test';
import { routeUrl, routes, QA_HOST } from '../constants/routes';
import { routeGoogleMapsViaNode } from './googleMaps';
import { DEFAULT_ROLE, type Role } from '../constants/roles';

export const AUTH_DIR = path.resolve(__dirname, '../../.auth');
export const SCREENSHOT_DIR = path.resolve(__dirname, '../../test-results');

/**
 * Storage-state file for one actor. One file per role so a spec can assert what a
 * lower-privileged user CANNOT do (WP-057, and the 45 other permission-scoped web cases in
 * the regression workbook) instead of only ever running as the admin.
 */
export function authFileFor(role: Role): string {
  return path.join(AUTH_DIR, `${role}.json`);
}

/** The pre-multi-role session path, kept only so an existing local session isn't thrown away. */
const LEGACY_AUTH_FILE = path.join(AUTH_DIR, 'auth-session.json');

/**
 * Move a pre-existing `.auth/auth-session.json` to `.auth/admin.json`.
 *
 * `.auth/` is gitignored, so every checkout that already ran `pnpm auth:qa` holds a valid
 * session under the old name. Renaming it (rather than requiring a fresh interactive SSO
 * login) keeps the upgrade invisible to whoever pulls this change. No-op once migrated, and
 * a no-op if an `admin.json` already exists — the newer file wins.
 */
export function migrateLegacyAuthFile(): void {
  const adminFile = authFileFor('admin');
  if (!existsSync(LEGACY_AUTH_FILE) || existsSync(adminFile)) return;
  ensureDir(AUTH_DIR);
  renameSync(LEGACY_AUTH_FILE, adminFile);
  log(`Migrated legacy session ${LEGACY_AUTH_FILE} -> ${adminFile}`);
}

/** Back-compat alias: the default (admin) actor's session file. */
export const AUTH_FILE = authFileFor(DEFAULT_ROLE);

export const ABORT_PATTERNS = [
  'captcha',
  'unusualactivity',
  'unusual_activity',
  'identity/challenge',
  'security-challenge',
  'blocked',
  'denied',
];

export function log(msg: string) {
  // eslint-disable-next-line no-console
  console.log(`[auth-setup] ${msg}`);
}

export function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function assertQaOnly(url: string) {
  const host = new URL(url).host;
  if (host.endsWith('folio3.site') && host !== QA_HOST) {
    throw new Error(`Refusing non-QA VannBrosPhaseTwo host: ${host}`);
  }
}

export function checkAbortPatterns(url: string) {
  const lower = url.toLowerCase();
  for (const pat of ABORT_PATTERNS) {
    if (lower.includes(pat)) {
      throw new Error(`Aborting: suspicious challenge URL detected (${pat}) -> ${url}`);
    }
  }
}

export function sessionFileHasAuth(file: string = AUTH_FILE): boolean {
  if (!existsSync(file)) return false;
  const size = statSync(file).size;
  if (size < 10) return false;
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf-8'));
    const cookies = Array.isArray(parsed?.cookies) ? parsed.cookies : [];
    const origins = Array.isArray(parsed?.origins) ? parsed.origins : [];
    return cookies.length > 0 || origins.length > 0;
  } catch {
    return false;
  }
}

/**
 * The app stores Season/Location context in localStorage as expiry-wrapped values
 * (`{"_expired": <epoch ms>, "_value": ...}`) with a SHORT, same-day TTL — independent of
 * the auth token's lifetime. A stored session can therefore still authenticate against
 * /maps while its Season has already expired. When that happens the app shows the
 * "Season details not found in storage" warning and renders the DEGRADED plot picker
 * ("Select Blocks" with Block/Activity-Area columns) instead of the real "Select Plots"
 * view — so tests silently run against a no-season state. Treat a session whose Season has
 * expired (or is absent) as unusable so the setup re-bootstraps a fresh, season-bearing one.
 */
export function sessionSeasonValid(storageStatePath: string, nowMs: number = Date.now()): boolean {
  if (!existsSync(storageStatePath)) return false;
  try {
    const parsed = JSON.parse(readFileSync(storageStatePath, 'utf-8'));
    const origins = Array.isArray(parsed?.origins) ? parsed.origins : [];
    const ls: Record<string, string> = {};
    for (const origin of origins) {
      for (const kv of origin?.localStorage ?? []) ls[kv.name] = kv.value;
    }
    // Both keys must be present AND un-expired for the season-bearing render.
    for (const key of ['seasonId', 'seasonName']) {
      const raw = ls[key];
      if (!raw) return false;
      const wrapped = JSON.parse(raw);
      if (wrapped?._value === undefined || wrapped?._value === null || wrapped?._value === '') {
        return false;
      }
      // `_expired` is the expiry epoch (ms); missing/past => expired.
      if (typeof wrapped?._expired !== 'number' || wrapped._expired <= nowMs) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function captureFailure(context: BrowserContext | null, label: string) {
  ensureDir(SCREENSHOT_DIR);
  if (!context) return;
  const pages = context.pages();
  const page = pages[pages.length - 1];
  if (!page) return;
  const url = page.url();
  log(`FAILURE (${label}). Current URL: ${url}`);
  const shotPath = path.join(SCREENSHOT_DIR, `auth-failure-${label}-${Date.now()}.png`);
  try {
    await page.screenshot({ path: shotPath, fullPage: true });
    log(`Saved failure screenshot: ${shotPath}`);
  } catch (err) {
    log(`Screenshot capture failed: ${(err as Error).message}`);
  }
}

// Time to let the SPA run its client-side auth guard. An expired session
// loads /maps then redirects to /login AFTER domcontentloaded, so the probe
// must settle before reading the final URL or it false-positives.
const PROBE_SETTLE_MS = 5_000;

export async function probeAuthenticated(
  browser: Browser,
  storageStatePath: string,
): Promise<boolean> {
  const context = await browser.newContext({ storageState: storageStatePath });
  await routeGoogleMapsViaNode(context);
  const page = await context.newPage();
  try {
    const response = await page.goto(routeUrl(routes.maps.root), {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    if (!response) return false;
    if (response.status() === 429) {
      throw new Error('HTTP 429 received while probing /maps. Aborting.');
    }

    // Wait for any post-load redirect (auth guard) to settle before judging.
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(PROBE_SETTLE_MS);

    const current = page.url();
    assertQaOnly(current);
    checkAbortPatterns(current);

    // Expired/invalid session bounces to /login — treat as unauthenticated.
    if (current.toLowerCase().includes('/login')) return false;
    return current.startsWith(routeUrl(routes.maps.root));
  } finally {
    await page.close();
    await context.close();
  }
}
