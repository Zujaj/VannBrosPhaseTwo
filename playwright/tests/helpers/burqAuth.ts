import { existsSync, readFileSync } from 'fs-extra';
import path from 'path';
import { AUTH_DIR } from './auth';

/**
 * Burq.io QA sign-in: email + password, then a code emailed to the account (`/loginwith2fa`).
 * The code can't be scripted, so a human always finishes the login. Format of the credentials
 * file: `auth-templates/README.md`.
 */

/** Saved storage state (cookies + localStorage). */
export const BURQ_AUTH_FILE = path.join(AUTH_DIR, 'burq-qa.json');

/** sessionStorage snapshot, which `storageState` doesn't capture; restored by an init script. */
export const BURQ_SESSION_STORAGE_FILE = path.join(AUTH_DIR, 'burq-qa.session-storage.json');

export const BURQ_CREDENTIALS_FILE = path.join(AUTH_DIR, 'burq_credentials.json');

export interface BurqCredential {
  readonly email: string;
  readonly password: string;
}

/**
 * The stored login, or null when none is stored — the human then types it too.
 * `BURQ_EMAIL` / `BURQ_PASSWORD` win over `.auth/burq_credentials.json` (`QA.email`, `QA.password`).
 */
export function burqCredential(): BurqCredential | null {
  const envEmail = process.env.BURQ_EMAIL?.trim();
  const envPassword = process.env.BURQ_PASSWORD;
  if (envEmail && envPassword) return { email: envEmail, password: envPassword };
  if (!existsSync(BURQ_CREDENTIALS_FILE)) return null;
  try {
    const entry = JSON.parse(readFileSync(BURQ_CREDENTIALS_FILE, 'utf-8'))?.QA;
    const email = typeof entry?.email === 'string' ? entry.email.trim() : '';
    const password = typeof entry?.password === 'string' ? entry.password : '';
    if (!email || !password || password === '<password>') return null;
    return { email, password };
  } catch {
    // Malformed file: fall back to the human path rather than failing the setup.
    return null;
  }
}

/** Init script that puts the saved sessionStorage back before the app boots. */
export function sessionStorageInitScript(): string | null {
  if (!existsSync(BURQ_SESSION_STORAGE_FILE)) return null;
  const entries = readFileSync(BURQ_SESSION_STORAGE_FILE, 'utf-8');
  return `(() => { const e = ${entries}; for (const [k, v] of Object.entries(e)) sessionStorage.setItem(k, v); })();`;
}
