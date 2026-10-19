import { existsSync } from 'fs-extra';
import { test as setup, expect } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import { AUTH_DIR, captureFailure, ensureDir, log } from '../helpers/auth';
import { WMS_AUTH_FILE, wmsPin } from '../helpers/wmsAuth';
import { WMS_QA_HOST, wmsRoutes, wmsUrl } from '../constants/routes';

/**
 * Bootstrap the YHS AgriWMS session (`pnpm auth:wms`), mirroring `auth.setup.ts`:
 * reuse -> scripted PIN -> human fallback -> persist -> re-validate.
 *
 * The scripted path clicks the keypad (key presses don't register on it). When no PIN is
 * stored, or the scripted entry doesn't get past /login, the visible window is handed to a
 * human, who has HUMAN_AUTH_TIMEOUT_MS to enter the PIN and pick the configuration.
 */

const HUMAN_AUTH_TIMEOUT_MS = 5 * 60 * 1000;
const SCRIPTED_STEP_TIMEOUT_MS = 30_000;
const RECEIVING_HEADING = 'Receiving Harvest Loads';
/** The 404 body every `/api/v1/*` call returned on 2026-10-19: signed in, but not in the WMS database. */
const NOT_PROVISIONED = /not found in the system/i;

/** Refuse any page host other than WMS QA; the auth gateway is reached by fetch, not navigation. */
function assertWmsQaOnly(url: string) {
  const { host, protocol } = new URL(url);
  if (protocol.startsWith('http') && host !== WMS_QA_HOST) {
    throw new Error(`Refusing host outside YHS AgriWMS QA (${WMS_QA_HOST}): ${host}`);
  }
}

const offLogin = (url: URL) => !url.pathname.startsWith(wmsRoutes.login);

async function enterPin(page: Page, pin: string, configuration: string) {
  await page.getByRole('button', { name: /^PIN/ }).click({ timeout: SCRIPTED_STEP_TIMEOUT_MS });
  for (const digit of pin) {
    await page.getByRole('button', { name: digit, exact: true }).click({ timeout: SCRIPTED_STEP_TIMEOUT_MS });
  }
  await page.getByRole('button', { name: configuration, exact: true }).click({ timeout: SCRIPTED_STEP_TIMEOUT_MS });
  await page.waitForURL(offLogin, { timeout: SCRIPTED_STEP_TIMEOUT_MS });
}

/**
 * Open /receiving with the saved session. Returns whether it rendered, and re-saves the state
 * so a token the app refreshed on load is kept.
 */
async function probeSession(browser: Browser): Promise<boolean> {
  const context = await browser.newContext({ storageState: WMS_AUTH_FILE });
  const page = await context.newPage();
  let notProvisioned = false;
  page.on('response', async (resp) => {
    if (resp.status() !== 404 || !resp.url().includes('/api/v1/')) return;
    try {
      if (NOT_PROVISIONED.test(await resp.text())) notProvisioned = true;
    } catch {
      // Body unavailable (navigation raced it): nothing to report.
    }
  });
  try {
    await page.goto(wmsUrl(wmsRoutes.receiving), { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.getByRole('heading', { name: RECEIVING_HEADING })).toBeVisible({ timeout: 30_000 });
    // Let the grid's first fetches land so the provisioning check below has seen them.
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
    await context.storageState({ path: WMS_AUTH_FILE });
    if (notProvisioned) {
      log(
        'WARNING: signed in, but the WMS API answers "user not found in the system" — this login is not ' +
          'provisioned in the WMS database, so every grid will be empty. Ask dev to provision it.',
      );
    }
    return true;
  } catch {
    return false;
  } finally {
    await context.close();
  }
}

setup.use({ storageState: { cookies: [], origins: [] } });

setup('authenticate (YHS AgriWMS superadmin)', async ({ browser }) => {
  setup.setTimeout(HUMAN_AUTH_TIMEOUT_MS + 2 * 60_000);
  ensureDir(AUTH_DIR);

  if (existsSync(WMS_AUTH_FILE)) {
    log('[wms] Existing session file found. Attempting silent reuse.');
    if (await probeSession(browser)) {
      log('[wms] Existing session is VALID.');
      return;
    }
    log('[wms] Existing session invalid. Will bootstrap a fresh login.');
  } else {
    log('[wms] No session file. Proceeding to PIN login.');
  }

  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('framenavigated', (frame) => {
    if (frame !== page.mainFrame()) return;
    try {
      assertWmsQaOnly(frame.url());
    } catch (err) {
      log((err as Error).message);
    }
  });

  try {
    log(`[wms] Opening login URL: ${wmsUrl(wmsRoutes.login)}`);
    await page.goto(wmsUrl(wmsRoutes.login), { waitUntil: 'domcontentloaded', timeout: 60_000 });

    const credential = wmsPin();
    if (credential) {
      log(`[wms] Entering the stored PIN, then Select Configuration -> ${credential.configuration}.`);
      try {
        await enterPin(page, credential.pin, credential.configuration);
      } catch (err) {
        log(
          `Scripted PIN entry did not complete (${(err as Error).message.split('\n')[0]}) — ` +
            'finish it in the browser window (Back, re-enter the PIN, pick the configuration).',
        );
      }
    } else {
      log('>>> No stored PIN (.auth/yhs_wms_credentials.json or YHS_WMS_PIN).');
      log('>>> In the browser window: PIN -> enter the 6-digit Superadmin PIN -> Select Configuration -> YHS.');
    }

    log('>>> Do NOT close the browser. Waiting for the app to leave /login...');
    await page.waitForURL(offLogin, { timeout: HUMAN_AUTH_TIMEOUT_MS });
    assertWmsQaOnly(page.url());
    // The redirect can beat the localStorage write; save only once the session is there.
    await page.waitForFunction(() => !!window.localStorage.getItem('agriwms_session'), null, {
      timeout: 60_000,
    });
    log(`[wms] Reached ${page.url()}.`);
    await context.storageState({ path: WMS_AUTH_FILE });
    log(`[wms] Saved storage state -> ${WMS_AUTH_FILE}`);
  } catch (err) {
    await captureFailure(context, 'bootstrap-wms');
    await context.close();
    throw err;
  }
  await context.close();

  log('[wms] Validating saved session in a fresh browser context.');
  expect(await probeSession(browser), '[wms] Persisted session failed to open /receiving').toBe(true);
  log('[wms] Persistence check OK. Session reusable.');
});
