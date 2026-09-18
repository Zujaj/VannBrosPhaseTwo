import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const QA_BASE_URL = 'https://agrierp-vann-qa.folio3.site';
// Default actor. Role-scoped specs override this per file via `asRole()`
// (tests/helpers/roleSession.ts), which points at `.auth/<role>.json`.
const AUTH_FILE = path.resolve(__dirname, '.auth/admin.json');

const AUTHENTICATED = /authenticated\//;
const GUEST = /public\//;

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  outputDir: path.resolve(__dirname, 'test-results'),
  fullyParallel: true,
  // Playwright's 30s default is tuned for fast apps. This SPA routinely spends 5-15s painting
  // a module (the grid fetches behind skeleton rows, the template list is slower still), so
  // at 30s a healthy run fails on the environment being ordinarily slow rather than on any
  // defect — which is exactly what a full 56-spec parallel run started doing. 90s leaves room
  // for a slow page plus its assertions; specs that legitimately need longer (multi-fetch
  // paging, the create flows) still raise their own budget.
  timeout: 90_000,
  forbidOnly: !!process.env.CI,
  // 1 local retry absorbs intermittent QA-env flakiness (slow SPA goto / auth-probe
  // redirect chain), so one transient timeout doesn't fail the whole local run.
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { outputFolder: path.resolve(__dirname, 'playwright-report') }]],
  use: {
    baseURL: QA_BASE_URL,
    trace: 'on-first-retry',
    // screenshot: 'only-on-failure',
    // video: 'on-first-retry',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: {
        ...devices['Desktop Firefox'],
        // Headed by default so a human can finish an MFA / consent screen that the stored
        // credential cannot. Set AUTH_HEADLESS=1 when the credential path is known to
        // complete unattended (and in CI, which has no display).
        headless: process.env.AUTH_HEADLESS === '1',
      },
    },
    // The regression workbook's `Test Data & Env` sheet scopes the web suite to a
    // "Chromium based Browser", and its Compatibility cases (CC-001..) name Chrome/Edge —
    // so Chromium is the primary engine. Firefox is kept as the second engine rather than
    // dropped: the whole existing suite was authored and verified against it, and the
    // loader/toast interception behaviour in `base.page.ts` was characterised there.
    {
      name: 'chromium',
      testMatch: AUTHENTICATED,
      testIgnore: /auth\.setup\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_FILE,
      },
    },
    {
      name: 'firefox',
      testMatch: AUTHENTICATED,
      testIgnore: /auth\.setup\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Firefox'],
        storageState: AUTH_FILE,
      },
    },
    {
      // Account triage: attempts one sign-in per QA account to find one the suite can use.
      // Its own project because it must NOT run with the ordinary guest specs — ~31 sign-ins
      // is slow and not something a normal suite run should do. Run it with
      // `pnpm triage:accounts`.
      name: 'triage',
      testMatch: /account-triage\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: { cookies: [], origins: [] },
      },
    },
    // Test-data seeding (`pnpm seed:planned` / `seed:harvest` / `seed:tickets`). Registered only
    // while scripts/seed.mts sets SEED, so a plain `pnpm test` never creates data. No retries: a
    // retried seed could save the same record twice.
    ...(process.env.SEED
      ? [
          {
            name: 'seed',
            testMatch: /seed\/.*\.seed\.ts/,
            dependencies: ['setup'],
            retries: 0,
            use: { ...devices['Desktop Chrome'], storageState: AUTH_FILE },
          },
        ]
      : []),
    {
      name: 'chromium-guest',
      testMatch: GUEST,
      // The triage spec lives under public/ (it needs empty storage) but belongs to the
      // `triage` project above, so it is kept out of the ordinary guest run.
      testIgnore: /account-triage\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: { cookies: [], origins: [] },
      },
    },
    {
      name: 'firefox-guest',
      testMatch: GUEST,
      testIgnore: /account-triage\.spec\.ts/,
      use: {
        ...devices['Desktop Firefox'],
        storageState: { cookies: [], origins: [] },
      },
    },
  ],
});
