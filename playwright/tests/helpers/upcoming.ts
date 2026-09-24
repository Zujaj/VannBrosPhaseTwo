import { test } from '@playwright/test';

/** `RUN_UPCOMING=1` (or `pnpm test:upcoming`) runs the `@upcoming` specs instead of parking them. */
export const RUN_UPCOMING = process.env.RUN_UPCOMING === '1';

/**
 * Park a test that automates behaviour a product spec (resources/product-specifications-document/)
 * defines but the QA build has not shipped yet. It is reported as `fixme` rather than failing
 * the regression run; `pnpm test:upcoming` runs it for real against a new build.
 *
 * Call it inside a test body, or inside a `test.describe` to park the whole group. The group form
 * also skips the file's `beforeEach` hooks, so parked tests cost no setup time.
 *
 * When the feature lands and the test passes under `test:upcoming`, delete the `upcoming()` call
 * and the `@upcoming` tag — the test then joins the ordinary suite.
 */
export function upcoming(what: string): void {
  test.fixme(!RUN_UPCOMING, `Not on QA yet: ${what}. Run \`pnpm test:upcoming\` to check a new build.`);
}
