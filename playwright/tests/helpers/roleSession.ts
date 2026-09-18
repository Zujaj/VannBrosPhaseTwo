import { existsSync } from 'fs-extra';
import { test } from '@playwright/test';
import { authFileFor } from './auth';
import { ROLE_PROFILES, type Role } from '../constants/roles';

/**
 * Run a spec (or a `describe` block) as a non-admin actor.
 *
 * ```ts
 * test.describe('Delete permissions', () => {
 *   asRole('farmhand');
 *   test('@TC:WP-057 Delete is not available to an unauthorised user', async ({ page }) => { ... });
 * });
 * ```
 *
 * Call it at the top of the file or `describe` — it wires the role's storage state and
 * skips the block (with an actionable message) when that role has not been bootstrapped.
 *
 * A missing session must SKIP, not fail: `.auth/` is gitignored and each role costs one
 * interactive Azure SSO login, so a checkout that has only bootstrapped `admin` is the
 * normal case. Failing there would make the suite red for a setup step the runner may have
 * deliberately not performed, and would hide real regressions in the roles they DO hold.
 */
export function asRole(role: Role): void {
  const storageState = authFileFor(role);

  test.beforeAll(() => {
    test.skip(
      !existsSync(storageState),
      `No session for role "${role}" (${ROLE_PROFILES[role].workbookLabel}). ` +
        `Bootstrap it with: AUTH_ROLES=${role} pnpm auth:qa`,
    );
  });

  test.use({ storageState });
}

/** True when the given role has a bootstrapped session on this machine. */
export function hasRoleSession(role: Role): boolean {
  return existsSync(authFileFor(role));
}
