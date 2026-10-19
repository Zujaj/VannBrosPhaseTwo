import { existsSync, readFileSync } from 'fs-extra';
import path from 'path';
import { AUTH_DIR } from './auth';

/**
 * YHS AgriWMS sign-in: a 6-digit PIN on an on-screen keypad, then the "Select Configuration"
 * modal (client `Vann Brothers - QA` -> company `YHS`). No SSO, so one session file serves the
 * whole run. Format of the credentials file: `auth-templates/README.md`.
 */

/** Saved storage state. The session lives in localStorage (`agriwms_session`, `auth-storage`). */
export const WMS_AUTH_FILE = path.join(AUTH_DIR, 'wms-superadmin.json');

export const WMS_CREDENTIALS_FILE = path.join(AUTH_DIR, 'yhs_wms_credentials.json');

/** The company to pick in "Select Configuration". */
export const WMS_DEFAULT_CONFIGURATION = 'YHS';

export interface WmsPin {
  readonly pin: string;
  readonly configuration: string;
}

/**
 * The Superadmin PIN, or null when none is stored — the setup then waits for a human to type it.
 * `YHS_WMS_PIN` wins over `.auth/yhs_wms_credentials.json` (`QA.Superadmin.pin`).
 */
export function wmsPin(): WmsPin | null {
  const fromEnv = process.env.YHS_WMS_PIN?.trim();
  if (fromEnv) return { pin: fromEnv, configuration: WMS_DEFAULT_CONFIGURATION };
  if (!existsSync(WMS_CREDENTIALS_FILE)) return null;
  try {
    const entry = JSON.parse(readFileSync(WMS_CREDENTIALS_FILE, 'utf-8'))?.QA?.Superadmin;
    const pin = typeof entry?.pin === 'string' ? entry.pin.trim() : '';
    if (!/^\d{6}$/.test(pin)) return null;
    const configuration =
      typeof entry.configuration === 'string' && entry.configuration.trim()
        ? entry.configuration.trim()
        : WMS_DEFAULT_CONFIGURATION;
    return { pin, configuration };
  } catch {
    // Malformed file: fall back to the human path rather than failing the setup.
    return null;
  }
}
