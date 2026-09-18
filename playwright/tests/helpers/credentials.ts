import { existsSync, readFileSync } from 'fs-extra';
import path from 'path';
import { AUTH_DIR } from './auth';
import { ROLE_PROFILES, type Role } from '../constants/roles';

/**
 * Where the suite gets a role's sign-in credentials.
 *
 * Two sources, in order:
 *
 * 1. **Environment** — `VANNBROSPHASETWO_<ROLE>_USER` / `VANNBROSPHASETWO_<ROLE>_PASS`
 *    (e.g. `VANNBROSPHASETWO_FARMHAND_USER`). This is what CI should use, via repository
 *    secrets. The pre-rename `AGRIERP_<ROLE>_*` names are still read as a fallback.
 * 2. **`.auth/credentials.json`** — a local, gitignored map, produced once from the QA
 *    team's account list by `pnpm creds:import`.
 *
 * Deliberately NOT a source: the plaintext `creds.txt` in the repo root. Nothing in the test
 * code reads it. It is untracked but was not gitignored, so it was one `git add -A` away
 * from publishing every QA password — it is now ignored, and the import step exists so the
 * file can be moved out of the repo entirely.
 *
 * Credentials are optional. When a role has none, `auth.setup.ts` falls back to the
 * human-assisted SSO login that was the only path before, so a checkout with no credentials
 * behaves exactly as it used to.
 */

export interface Credential {
  readonly username: string;
  readonly password: string;
}

export const CREDENTIALS_FILE = path.join(AUTH_DIR, 'credentials.json');

/** `farmhand` -> `VANNBROSPHASETWO_FARMHAND_USER` / `..._PASS`, plus the legacy `AGRIERP_*` pair. */
function envVarNames(role: Role): { user: string; pass: string; legacyUser: string; legacyPass: string } {
  // camelCase roles (multiGrower, restrictedLocation) become MULTI_GROWER / RESTRICTED_LOCATION.
  const key = role.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase();
  return {
    user: `VANNBROSPHASETWO_${key}_USER`,
    pass: `VANNBROSPHASETWO_${key}_PASS`,
    legacyUser: `AGRIERP_${key}_USER`,
    legacyPass: `AGRIERP_${key}_PASS`,
  };
}

function fromEnv(role: Role): Credential | null {
  const { user, pass, legacyUser, legacyPass } = envVarNames(role);
  const username = process.env[user] || process.env[legacyUser];
  const password = process.env[pass] || process.env[legacyPass];
  if (!username || !password) return null;
  return { username, password };
}

function fromFile(role: Role): Credential | null {
  if (!existsSync(CREDENTIALS_FILE)) return null;
  try {
    const parsed = JSON.parse(readFileSync(CREDENTIALS_FILE, 'utf-8')) as Record<string, unknown>;
    const entry = parsed[role];
    if (!entry || typeof entry !== 'object') return null;
    const { username, password } = entry as Partial<Credential>;
    if (!username || !password) return null;
    return { username, password };
  } catch {
    // A malformed credentials file must not take the suite down — fall back to human login.
    return null;
  }
}

export function credentialsFor(role: Role): Credential | null {
  return fromEnv(role) ?? fromFile(role);
}

/** Roles that can be bootstrapped without a human at the keyboard. */
export function rolesWithCredentials(): Role[] {
  return (Object.keys(ROLE_PROFILES) as Role[]).filter(
    (role) => ROLE_PROFILES[role].bootstrappable && credentialsFor(role) !== null,
  );
}

/** Redact a username for logs: `f3-agrierp-04@f3dynamics.onmicrosoft.com` -> `f3-a***@f3dynamics.onmicrosoft.com`. */
export function maskUsername(username: string): string {
  const [local, domain] = username.split('@');
  const head = local.slice(0, 4);
  return domain ? `${head}***@${domain}` : `${head}***`;
}
