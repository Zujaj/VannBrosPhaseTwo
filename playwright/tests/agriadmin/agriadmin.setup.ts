import { existsSync } from 'fs-extra';
import { test as setup, expect } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import { AUTH_DIR, captureFailure, ensureDir, log } from '../helpers/auth';
import { AGRIADMIN_AUTH_FILE, agriAdminPin } from '../helpers/agriAdminAuth';
import { AGRIADMIN_QA_HOST, agriAdminRoutes, agriAdminUrl } from '../constants/routes';

/**
 * Bootstrap the YHS AgriAdmin session (`pnpm auth:agriadmin`), mirroring `wms.setup.ts`:
 * reuse -> scripted PIN -> human fallback -> persist -> re-validate.
 *
 * The keypad only takes clicks. When no PIN is stored, or the scripted entry doesn't get past
 * /login, the visible window is handed to a human for HUMAN_AUTH_TIMEOUT_MS.
 */

const HUMAN_AUTH_TIMEOUT_MS = 5 * 60 * 1000;
const SCRIPTED_STEP_TIMEOUT_MS = 30_000;
const FLEET_MASTER_TEXT = /Fleet/i;

/** Refuse any page host other than AgriAdmin QA. */
function assertAgriAdminQaOnly(url: string) {
  const { host, protocol } = new URL(url);
  if (protocol.startsWith('http') && host !== AGRIADMIN_QA_HOST) {
    throw new Error(`Refusing host outside YHS AgriAdmin QA (${AGRIADMIN_QA_HOST}): ${host}`);
  }
}

const offLogin = (url: URL) => !url.pathname.startsWith(agriAdminRoutes.login);

async function enterPin(page: Page, pin: string, configuration: string) {
  await page.getByRole('button', { name: /^PIN/ }).click({ timeout: SCRIPTED_STEP_TIMEOUT_MS });
  for (const digit of pin) {
    await page.getByRole('button', { name: digit, exact: true }).click({ timeout: SCRIPTED_STEP_TIMEOUT_MS });
  }
  await page.getByRole('button', { name: configuration, exact: true }).click({ timeout: SCRIPTED_STEP_TIMEOUT_MS });
  await page.waitForURL(offLogin, { timeout: SCRIPTED_STEP_TIMEOUT_MS });
}

/**
 * Open /fleet-master with the saved session. Unlike the WMS probe, this one checks that the page
 * stays off /login after the app boots, not just that the URL loaded.
 */
async function probeSession(browser: Browser): Promise<boolean> {
  const context = await browser.newContext({ storageState: AGRIADMIN_AUTH_FILE });
  const page = await context.newPage();
  try {
    await page.goto(agriAdminUrl(agriAdminRoutes.fleetMaster), { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined);
    if (!offLogin(new URL(page.url()))) return false;
    await expect(page.getByText(FLEET_MASTER_TEXT).first()).toBeVisible({ timeout: 30_000 });
    await context.storageState({ path: AGRIADMIN_AUTH_FILE });
    return true;
  } catch {
    return false;
  } finally {
    await context.close();
  }
}

setup.use({ storageState: { cookies: [], origins: [] } });

setup('authenticate (YHS AgriAdmin superadmin)', async ({ browser }) => {
  setup.setTimeout(HUMAN_AUTH_TIMEOUT_MS + 2 * 60_000);
  ensureDir(AUTH_DIR);

  if (existsSync(AGRIADMIN_AUTH_FILE)) {
    log('[agriadmin] Existing session file found. Attempting silent reuse.');
    if (await probeSession(browser)) {
      log('[agriadmin] Existing session is VALID.');
      return;
    }
    log('[agriadmin] Existing session invalid. Will bootstrap a fresh login.');
  } else {
    log('[agriadmin] No session file. Proceeding to PIN login.');
  }

  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('framenavigated', (frame) => {
    if (frame !== page.mainFrame()) return;
    try {
      assertAgriAdminQaOnly(frame.url());
    } catch (err) {
      log((err as Error).message);
    }
  });

  try {
    log(`[agriadmin] Opening login URL: ${agriAdminUrl(agriAdminRoutes.login)}`);
    await page.goto(agriAdminUrl(agriAdminRoutes.login), { waitUntil: 'domcontentloaded', timeout: 60_000 });

    const credential = agriAdminPin();
    if (credential) {
      log(`[agriadmin] Entering the stored PIN, then Select Configuration -> ${credential.configuration}.`);
      try {
        await enterPin(page, credential.pin, credential.configuration);
      } catch (err) {
        log(
          `Scripted PIN entry did not complete (${(err as Error).message.split('\n')[0]}) — ` +
            'finish it in the browser window (Back, re-enter the PIN, pick the configuration).',
        );
      }
    } else {
      log('>>> No stored PIN (.auth/yhs_agri_admin_credentials.json or YHS_AGRIADMIN_PIN).');
      log('>>> In the browser window: PIN -> enter the 6-digit Superadmin PIN -> Select Configuration -> YHS.');
    }

    log('>>> Do NOT close the browser. Waiting for the app to leave /login...');
    await page.waitForURL(offLogin, { timeout: HUMAN_AUTH_TIMEOUT_MS });
    assertAgriAdminQaOnly(page.url());
    // The redirect can beat the localStorage write; give it a moment before saving.
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined);
    log(`[agriadmin] Reached ${page.url()}.`);
    await context.storageState({ path: AGRIADMIN_AUTH_FILE });
    log(`[agriadmin] Saved storage state -> ${AGRIADMIN_AUTH_FILE}`);
  } catch (err) {
    await captureFailure(context, 'bootstrap-agriadmin');
    await context.close();
    throw err;
  }
  await context.close();

  log('[agriadmin] Validating saved session in a fresh browser context.');
  expect(await probeSession(browser), '[agriadmin] Persisted session failed to open /fleet-master').toBe(true);
  log('[agriadmin] Persistence check OK. Session reusable.');
});
