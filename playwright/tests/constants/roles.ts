/**
 * The actor accounts the Vann Brothers regression suite is written against.
 *
 * Source of truth: `AgriFarm_VannBrothers_Regression_Suite_Web_iOS.xlsx`, sheet
 * `Test Data & Env` > "Accounts required". The workbook lists nine profiles and 45 of its
 * 633 web cases are only meaningful when executed as a NON-admin actor (every `Security`
 * case, the whole `12 Users, Roles & Perms` tab, and the `Permissions` sub-process on
 * Planning / Observations / Harvest Central / Settings / Communication Center).
 *
 * The suite previously had exactly one stored session, so none of those cases could be
 * automated: a test cannot prove "Delete is not available to an unauthorised user"
 * (WP-057) while the only session available holds full rights.
 *
 * Each role bootstraps to its OWN storage-state file under `.auth/`. Logins are
 * human-assisted (Azure AD SSO, see `auth.setup.ts`), so a role is bootstrapped once and
 * then reused until its session expires — the same lifecycle the single admin session
 * already had, just keyed by role.
 */

import roleProfiles from './roles.json';

export const ROLES = [
  'admin',
  'supervisor',
  'responsible',
  'operator',
  'farmhand',
  'multiGrower',
  'restrictedLocation',
  'bypassAttendance',
  'inactive',
] as const;

export type Role = (typeof ROLES)[number];

/** The role every existing authenticated spec runs as, and the only one bootstrapped by default. */
export const DEFAULT_ROLE: Role = 'admin';

export interface RoleProfile {
  /** Verbatim label from the workbook's `Test Data & Env` > "Accounts required" table. */
  readonly workbookLabel: string;
  /** What the account must be able to do, per the workbook. */
  readonly description: string;
  /**
   * `false` for accounts that are expected to FAIL authentication (the deactivated user
   * behind GN-007). `auth.setup.ts` must not try to persist a session for those — they are
   * driven live, from the login page, by the spec that asserts the refusal.
   */
  readonly bootstrappable: boolean;
}

/**
 * Profile data lives in `roles.json` so the `scripts/*.mts` tooling can read the same table
 * without importing this module: the package is CommonJS, Node loads a `.ts` file here as
 * CJS, and an ESM script cannot then pull named exports out of it.
 */
export const ROLE_PROFILES = roleProfiles as Record<Role, RoleProfile>;

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

/**
 * Roles the `setup` project should bootstrap this run, from `AUTH_ROLES`
 * (comma-separated, e.g. `AUTH_ROLES=admin,supervisor`). Defaults to `admin` alone so the
 * existing `pnpm auth:qa` workflow is unchanged — bootstrapping every role would otherwise
 * demand nine interactive SSO logins from whoever runs it.
 */
export function rolesToBootstrap(): Role[] {
  const raw = process.env.AUTH_ROLES?.trim();
  if (!raw) return [DEFAULT_ROLE];
  if (raw === 'all') return ROLES.filter((r) => ROLE_PROFILES[r].bootstrappable);

  const requested = raw.split(',').map((r) => r.trim()).filter(Boolean);
  const unknown = requested.filter((r) => !isRole(r));
  if (unknown.length) {
    throw new Error(
      `AUTH_ROLES contains unknown role(s): ${unknown.join(', ')}. Known roles: ${ROLES.join(', ')}`,
    );
  }
  const notBootstrappable = (requested as Role[]).filter((r) => !ROLE_PROFILES[r].bootstrappable);
  if (notBootstrappable.length) {
    throw new Error(
      `AUTH_ROLES contains role(s) that cannot hold a session: ${notBootstrappable.join(', ')}. ` +
        `These are expected to be refused at sign-in and are driven live by their own spec.`,
    );
  }
  return requested as Role[];
}
