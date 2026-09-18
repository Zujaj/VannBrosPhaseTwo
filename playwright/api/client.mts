/**
 * Minimal client for the VannBrosPhaseTwo REST API on the QA env, for scripts that need to act on
 * data directly instead of through the UI (cleanup, lookups).
 *
 * Endpoints are documented at https://agrierp-vann-api-qa.folio3.site/swagger (v1).
 *
 * Auth. The API wants `Authorization: Bearer <token>`, where the token is the Firebase ID token
 * (a JWT, ~1100 chars, issuer `securetoken.google.com/agrierp-vann-qa`) the web app holds after
 * login. It expires about an hour after issue. Checked 2026-09-17: the short token from
 * `POST /api/Auth/signin` is NOT it (401 everywhere, and that endpoint issues one even for a
 * wrong password). The token is not minted here; a person supplies it via (first match wins):
 *
 *   1. `VANNBROSPHASETWO_API_TOKEN` environment variable (the former `AGRIERP_API_TOKEN` still works)
 *   2. `.auth/qa_refresh_token.txt` (gitignored), a file holding just the token — or a JSON object
 *      with a `token` field, if you'd rather save the whole thing
 *
 * Either may include the `Bearer ` prefix or not. `VANNBROSPHASETWO_API_BASE` overrides the base URL.
 * Nothing here prints the token.
 *
 * To fetch a fresh token:
 *   1. Log in to https://agrierp-vann-qa.folio3.site/ as `rffcropplanner` and open the QA site.
 *   2. Open the browser console, go to the `Network` tab and filter to `Fetch/XHR` so it records
 *      requests.
 *   3. Visit any existing work order, e.g. https://agrierp-vann-qa.folio3.site/workorders/31293.
 *   4. In the Network tab open the `31293` request and copy the token from its request headers
 *      (`Authorization: Bearer <token>`).
 *   5. Write it, on one line, to `.auth/qa_refresh_token.txt` (or export it as
 *      `VANNBROSPHASETWO_API_TOKEN`).
 */
import { existsSync, readFileSync } from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
export const TOKEN_FILE = path.join(ROOT, '.auth', 'qa_refresh_token.txt');
const DEFAULT_BASE = 'https://agrierp-vann-api-qa.folio3.site/api';
// QA only, same rule as the UI suite: refuse any host that is not a QA host.
const QA_HOST = /^https:\/\/agrierp-[a-z-]*qa[a-z-]*\.folio3\.site(\/|$)/;

export class ApiError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(status: number, request: string, body: string) {
    super(`${status} from ${request}${body ? `: ${body.slice(0, 300)}` : ''}`);
    this.status = status;
    this.body = body;
  }
}

/**
 * The token out of `.auth/qa_refresh_token.txt`. The file is normally the bare token on one line;
 * a JSON object is accepted too, so saving the whole thing works as well as pasting the token.
 */
function readTokenFile(): string {
  if (!existsSync(TOKEN_FILE)) return '';
  const raw = readFileSync(TOKEN_FILE, 'utf8').trim();
  if (!raw.startsWith('{')) return raw;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${path.relative(process.cwd(), TOKEN_FILE)} starts with '{' but is not valid JSON`);
  }
  const value = parsed.token ?? parsed.qa_refresh_token ?? parsed.access_token;
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${path.relative(process.cwd(), TOKEN_FILE)} is JSON without a "token" string`);
  }
  return value.trim();
}

function readToken(): string {
  const raw =
    process.env.VANNBROSPHASETWO_API_TOKEN?.trim() ||
    // Pre-rename name, still honoured so existing shells and CI keep working.
    process.env.AGRIERP_API_TOKEN?.trim() ||
    readTokenFile();
  if (!raw) {
    throw new Error(
      `no API token: set VANNBROSPHASETWO_API_TOKEN or write the token to ${path.relative(process.cwd(), TOKEN_FILE)}`,
    );
  }
  const tokenEnv = process.env.VANNBROSPHASETWO_API_TOKEN
    ? 'VANNBROSPHASETWO_API_TOKEN'
    : process.env.AGRIERP_API_TOKEN
      ? 'AGRIERP_API_TOKEN'
      : null;
  console.log(`Using API token from ${tokenEnv ?? TOKEN_FILE}`);
  const token = raw.replace(/^Bearer\s+/i, '');
  const expiry = jwtExpiry(token);
  if (expiry === null) {
    throw new Error('API token is not a JWT; use the web app login token, not the one from Auth/signin');
  }
  if (expiry <= Date.now()) {
    throw new Error(`API token expired at ${new Date(expiry).toISOString()}; replace it with a fresh one`);
  }
  return `Bearer ${token}`;
}

/** The `exp` claim of a JWT in ms, or null if `token` is not a JWT. */
function jwtExpiry(token: string): number | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const { exp } = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

export class ApiClient {
  readonly base: string;
  private readonly auth: string;
  private readonly timeoutMs: number;

  constructor({ base = process.env.VANNBROSPHASETWO_API_BASE || process.env.AGRIERP_API_BASE || DEFAULT_BASE, timeoutMs = 60_000 } = {}) {
    if (!QA_HOST.test(base)) throw new Error(`refusing non-QA API base: ${base}`);
    this.base = base.replace(/\/$/, '');
    this.auth = readToken();
    this.timeoutMs = timeoutMs;
  }

  get<T = unknown>(route: string, query: Record<string, string | number | undefined> = {}): Promise<T> {
    return this.send<T>('GET', route, query);
  }

  /** `timeoutMs` overrides the client default for one slow call (e.g. a large WO save). */
  post<T = unknown>(route: string, body: unknown, { timeoutMs }: { timeoutMs?: number } = {}): Promise<T> {
    return this.send<T>('POST', route, {}, body, timeoutMs);
  }

  delete<T = unknown>(route: string): Promise<T> {
    return this.send<T>('DELETE', route);
  }

  private async send<T>(
    method: string,
    route: string,
    query: Record<string, string | number | undefined> = {},
    body?: unknown,
    timeoutMs = this.timeoutMs,
  ): Promise<T> {
    const url = new URL(`${this.base}/${route.replace(/^\//, '')}`);
    for (const [k, v] of Object.entries(query)) if (v !== undefined) url.searchParams.set(k, String(v));
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: this.auth,
        accept: 'application/json',
        ...(body !== undefined && { 'content-type': 'application/json' }),
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await res.text();
    if (!res.ok) throw new ApiError(res.status, `${method} ${url.pathname}${url.search}`, text);
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as T;
    }
  }
}
