import { test as setup, expect } from '@playwright/test';
import type { Browser } from '@playwright/test';
import {
  AUTH_DIR,
  assertQaOnly,
  authFileFor,
  captureFailure,
  checkAbortPatterns,
  ensureDir,
  log,
  migrateLegacyAuthFile,
  probeAuthenticated,
  sessionFileHasAuth,
  sessionSeasonValid,
} from './helpers/auth';
import { ROLE_PROFILES, rolesToBootstrap, type Role } from './constants/roles';
import { credentialsFor, maskUsername } from './helpers/credentials';
import { classifyBlocker, signIn, type SignInBlocker } from './helpers/signIn';
import { routeGoogleMapsViaNode } from './helpers/googleMaps';
import { routeUrl, routes } from './constants/routes';
import type { Page } from '@playwright/test';

const HUMAN_AUTH_TIMEOUT_MS = 5 * 60 * 1000;
// Fallback dwell only. The real gate is `waitForSessionContext` below: a fixed sleep was
// racing the app, which reaches /maps before it has written its Season and token to storage.
const STABILIZE_MS = 5_000;
const SESSION_CONTEXT_TIMEOUT_MS = 60_000;


/**
 * Turn a shared sign-in blocker into role-specific, actionable guidance.
 *
 * Without this a stale account costs a full test timeout and a stack trace pointing at
 * `waitForURL`, which says nothing about the cause. Detect-and-report only, never self-heal:
 * these are shared QA accounts, and silently resetting a password or enrolling a second
 * factor would lock out whoever else is using them.
 */
const BLOCKER_GUIDANCE: Record<SignInBlocker, (role: Role) => string> = {
  'password-change-required': (role) =>
    `Azure AD requires a password change for the "${role}" account before it can sign in. ` +
    `Reset it in the tenant (or set a non-expiring QA password), then update the entry in ` +
    `.auth/credentials.json / VANNBROSPHASETWO_${role.toUpperCase()}_PASS and re-run.`,
  'mfa-enrolment-required': (role) =>
    `The "${role}" account's password is accepted, but Azure AD requires MFA ENROLMENT ` +
    `("Let's keep your account secure") before it can sign in. Automation cannot complete ` +
    `this — it registers a second factor against a real person's account. Either enrol it ` +
    `once by hand (run without AUTH_HEADLESS=1) or have the tenant admin exclude QA test ` +
    `accounts from the MFA registration policy.`,
  'mfa-challenge': (role) =>
    `The "${role}" account is enrolled in MFA, so it cannot be bootstrapped unattended. ` +
    `Run without AUTH_HEADLESS=1 and complete the challenge in the browser window.`,
  'credential-rejected': (role) =>
    `The stored credential for "${role}" was rejected by Azure AD. Check it.`,
  'no-vannbrosphasetwo-access': (role) =>
    `The "${role}" account authenticates but has no VannBrosPhaseTwo access. Provision it, or pick ` +
    `another account — see test-plans/ACCOUNT-TRIAGE.md.`,
};

/**
 * Wait until the app has written a live Season (and Location) into localStorage.
 *
 * These are the expiry-wrapped values `sessionSeasonValid` checks, and the app writes them a
 * beat AFTER the redirect to /maps completes. Returns false on timeout so the caller can log
 * it rather than throwing — a session without a Season is still worth saving and diagnosing.
 */
async function waitForSessionContext(page: Page): Promise<boolean> {
  try {
    await page.waitForFunction(
      () => {
        const live = (key: string) => {
          const raw = window.localStorage.getItem(key);
          if (!raw) return false;
          try {
            const wrapped = JSON.parse(raw);
            return (
              wrapped?._value !== undefined &&
              wrapped?._value !== null &&
              wrapped?._value !== '' &&
              typeof wrapped?._expired === 'number' &&
              wrapped._expired > Date.now()
            );
          } catch {
            return false;
          }
        };
        return live('seasonId') && live('seasonName');
      },
      null,
      { timeout: SESSION_CONTEXT_TIMEOUT_MS },
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Fail fast on an identity-provider screen that the scripted sign-in cannot get past.
 * No-op when none is showing, so the normal path is unaffected.
 */
async function assertNotBlocked(page: Page, role: Role): Promise<void> {
  const blocker = await classifyBlocker(page);
  if (blocker) throw new Error(BLOCKER_GUIDANCE[blocker](role));
}



setup.use({ storageState: { cookies: [], origins: [] } });

// Each role needs a HUMAN to complete Azure SSO in the visible window. Running these in
// parallel would open several login windows at once with no way to tell which is which, so
// they are forced serial — one prompt at a time, in the order given by AUTH_ROLES.
setup.describe.configure({ mode: 'serial' });

/**
 * Bootstrap one actor's storage state.
 *
 * Unchanged in substance from the original single-session flow (reuse -> probe -> human
 * login -> persist -> re-validate); the only difference is that the target file and the
 * operator prompt are keyed by role, so the suite can hold several actors at once.
 */
async function bootstrapRole(role: Role, browser: Browser) {
  const authFile = authFileFor(role);
  const profile = ROLE_PROFILES[role];
  ensureDir(AUTH_DIR);

  if (sessionFileHasAuth(authFile)) {
    log(`[${role}] Existing session file found. Attempting silent reuse.`);
    // Auth alone is not enough: the Season entry has a short same-day TTL and expires
    // independently of the token. A season-expired session still passes the /maps probe
    // but renders the degraded "Select Blocks" (no-season) plot picker, so reject it here
    // and force a fresh login that re-stamps a live Season.
    if (!sessionSeasonValid(authFile)) {
      log(`[${role}] Session Season is missing or expired. Will bootstrap a fresh login.`);
    } else if (await probeAuthenticated(browser, authFile)) {
      log(`[${role}] Existing session is VALID (auth + live Season). Stopping immediately.`);
      return;
    } else {
      log(`[${role}] Existing session invalid. Will bootstrap a fresh login.`);
    }
  } else {
    log(`[${role}] No usable session file. Proceeding to human-assisted login.`);
  }

  const context = await browser.newContext();
  // /login serves the same index.html, so its blocking Maps script needs the same routing.
  await routeGoogleMapsViaNode(context);
  const page = await context.newPage();

  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) {
      try {
        assertQaOnly(frame.url());
      } catch (err) {
        log((err as Error).message);
      }
    }
  });

  let saw429 = false;
  page.on('response', (resp) => {
    if (resp.status() === 429) saw429 = true;
  });

  try {
    log(`[${role}] Opening login URL: ${routeUrl(routes.login)}`);

    const credential = credentialsFor(role);
    if (credential) {
      log(`[${role}] Signing in as ${maskUsername(credential.username)} from stored credentials.`);
      await signIn(page, credential, (reason) =>
        log(`Automated sign-in did not complete the whole flow (${reason}) — finish it in the browser window.`),
      );
    } else {
      // `signIn` navigates for us; the human path has to open /login itself.
      await page.goto(routeUrl(routes.login), { waitUntil: 'domcontentloaded', timeout: 60_000 });
      // Name the account wanted: with several roles in play, signing in as the wrong one
      // produces a session that authenticates fine and then fails permission assertions in a
      // way that looks like a product bug.
      log(`>>> No stored credential for "${role}". Sign in as the "${profile.workbookLabel}" account.`);
      log(`>>> Required rights: ${profile.description}`);
    }
    // Surface a dead-end sign-in screen now, rather than after a six-minute timeout whose
    // stack trace points at waitForURL and says nothing about the cause.
    await assertNotBlocked(page, role);

    log('>>> Do NOT close the browser. Waiting for redirect to /maps...');

    await page.waitForURL(`${routeUrl(routes.maps.root)}**`, { timeout: HUMAN_AUTH_TIMEOUT_MS });

    const finalUrl = page.url();
    assertQaOnly(finalUrl);
    checkAbortPatterns(finalUrl);
    if (saw429) throw new Error('HTTP 429 observed during login flow. Aborting.');

    log(`[${role}] Reached ${finalUrl}. Waiting for the app to write its session context.`);
    // Landing on /maps is NOT the end of sign-in. The app then writes its Season and Location
    // into localStorage, and a state saved before that produces a session that reports "no
    // live Season" and fails its own re-validation — which is exactly how this started failing
    // when the environment slowed down. Wait for the signal rather than sleeping past it.
    const wrote = await waitForSessionContext(page);
    if (!wrote) {
      log(`[${role}] Season/Location never appeared in storage after ${SESSION_CONTEXT_TIMEOUT_MS}ms.`);
    }
    await page.waitForTimeout(STABILIZE_MS);

    await context.storageState({ path: authFile });
    log(`[${role}] Saved storage state -> ${authFile}`);

    // The plot picker only renders the real "Select Plots" view when a live Season is in
    // storage. Warn loudly if the fresh login didn't stamp one (e.g. no Season selected for
    // this user/tenant) — otherwise the suite will quietly run the degraded "Select Blocks"
    // path until someone notices the "Season details not found in storage" warning.
    if (!sessionSeasonValid(authFile)) {
      log(`[${role}] WARNING: saved session has no live Season — tests will hit the degraded "Select Blocks" path.`);
    }
  } catch (err) {
    await captureFailure(context, `bootstrap-${role}`);
    await context.close();
    throw err;
  }

  await context.close();

  log(`[${role}] Validating saved session in a fresh browser context.`);
  const authed = await probeAuthenticated(browser, authFile);
  expect(authed, `[${role}] Persisted session failed to authenticate against /maps`).toBe(true);
  log(`[${role}] Persistence check OK. Session reusable.`);
}

// Rename any pre-multi-role `.auth/auth-session.json` to `.auth/admin.json` before the
// admin bootstrap probes for it, so an existing local session is reused rather than
// re-prompting for SSO on first run after this change.
migrateLegacyAuthFile();

for (const role of rolesToBootstrap()) {
  setup(`authenticate (${role})`, async ({ browser }) => {
    setup.setTimeout(HUMAN_AUTH_TIMEOUT_MS + 60_000);
    await bootstrapRole(role, browser);
  });
}
