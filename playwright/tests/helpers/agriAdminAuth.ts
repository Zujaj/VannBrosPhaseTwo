import { existsSync, readFileSync } from 'fs-extra';
import path from 'path';
import { AUTH_DIR } from './auth';

/**
 * YHS AgriAdmin sign-in: the same 6-digit PIN keypad and "Select Configuration" modal as AgriWMS
 * (`wmsAuth.ts`). AgriAdmin owns the YHS master data (fleet, drivers, trucks, trailers) that Burq
 * pushes to the Farm App. Format of the credentials file: `auth-templates/README.md`.
 */

/** Saved storage state (session in localStorage). */
export const AGRIADMIN_AUTH_FILE = path.join(AUTH_DIR, 'agriadmin-superadmin.json');

export const AGRIADMIN_CREDENTIALS_FILE = path.join(AUTH_DIR, 'yhs_agri_admin_credentials.json');

/** The company to pick in "Select Configuration". */
export const AGRIADMIN_DEFAULT_CONFIGURATION = 'YHS';

export interface AgriAdminPin {
  readonly pin: string;
  readonly configuration: string;
}

/**
 * The Superadmin PIN, or null when none is stored — the setup then waits for a human to type it.
 * `YHS_AGRIADMIN_PIN` wins over `.auth/yhs_agri_admin_credentials.json` (`QA.Superadmin.pin`).
 */
export function agriAdminPin(): AgriAdminPin | null {
  const fromEnv = process.env.YHS_AGRIADMIN_PIN?.trim();
  if (fromEnv) return { pin: fromEnv, configuration: AGRIADMIN_DEFAULT_CONFIGURATION };
  if (!existsSync(AGRIADMIN_CREDENTIALS_FILE)) return null;
  try {
    const entry = JSON.parse(readFileSync(AGRIADMIN_CREDENTIALS_FILE, 'utf-8'))?.QA?.Superadmin;
    const pin = typeof entry?.pin === 'string' ? entry.pin.trim() : '';
    if (!/^\d{6}$/.test(pin)) return null;
    const configuration =
      typeof entry.configuration === 'string' && entry.configuration.trim()
        ? entry.configuration.trim()
        : AGRIADMIN_DEFAULT_CONFIGURATION;
    return { pin, configuration };
  } catch {
    // Malformed file: fall back to the human path rather than failing the setup.
    return null;
  }
}
