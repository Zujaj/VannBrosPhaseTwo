import { readFileSync } from 'fs';
import { request, type APIRequestContext } from '@playwright/test';
import { QA_API_BASE_URL } from '../constants/routes';
import type { Role } from '../constants/roles';
import { authFileFor } from './auth';

/**
 * A REST client that acts as one role, for specs that must assert against the API as a
 * particular user (e.g. the operator trying to decide their own hour log request).
 *
 * The bearer is the role's saved UI session token (`printToken` in `.auth/<role>.json`) — the
 * same one `api/client.mts` uses for scripts, kept fresh by every `pnpm auth:qa` run. Specs
 * are CommonJS and cannot import that ESM client, hence this small twin.
 */
export function sessionToken(role: Role): string {
  const state = JSON.parse(readFileSync(authFileFor(role), 'utf8'));
  for (const origin of state.origins ?? []) {
    const kv = origin.localStorage?.find((e: { name: string }) => e.name === 'printToken');
    if (kv) return JSON.parse(kv.value)._value;
  }
  throw new Error(`no printToken in ${authFileFor(role)}; run AUTH_ROLES=${role} pnpm auth:qa`);
}

export function apiAs(role: Role): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: QA_API_BASE_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${sessionToken(role)}`, accept: 'application/json' },
  });
}
