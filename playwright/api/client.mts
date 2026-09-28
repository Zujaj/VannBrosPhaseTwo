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
 * wrong password). The token is not minted here; it comes from (first usable wins):
 *
 *   1. `VANNBROSPHASETWO_API_TOKEN` environment variable (the former `AGRIERP_API_TOKEN` still works)
 *   2. `.auth/qa_refresh_token.txt` (gitignored), a file holding just the token — or a JSON object
 *      with a `token` field, if you'd rather save the whole thing. Skipped once expired.
 *   3. The UI suite's saved session, `.auth/admin.json` (its `printToken`). The `setup` project
 *      refreshes it on every run, so after `pnpm auth:qa` (~3s) it is good for about an hour.
 *      Read only: refreshing here would spend the token the running tests hold.
 *
 * 1 and 2 may include the `Bearer ` prefix or not. `VANNBROSPHASETWO_API_BASE` overrides the base
 * URL. Nothing here prints the token.
 *
 * To fetch a token by hand instead (normally not needed, see 3):
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
export const SESSION_FILE = path.join(ROOT, '.auth', 'admin.json');
/**
 * A second actor's token, for flows one user cannot do alone — e.g. an operator raises an hour
 * log change request that the admin then decides (self-approval is refused). Gitignored; the
 * user pastes the operator's Firebase ID token here (same way as the admin one) or exports
 * `VANNBROSPHASETWO_OPERATOR_TOKEN`.
 */
export const OPERATOR_TOKEN_FILE = path.join(ROOT, '.auth', 'qa_operator_token.txt');
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

/** The access token from the UI suite's saved session, or '' if there is none. */
function readSessionToken(): string {
  if (!existsSync(SESSION_FILE)) return '';
  try {
    const state = JSON.parse(readFileSync(SESSION_FILE, 'utf8'));
    for (const origin of state.origins ?? []) {
      const kv = origin.localStorage?.find((e: { name: string }) => e.name === 'printToken');
      // Stored expiry-wrapped: {"_expired": ..., "_value": "<jwt>"}.
      if (kv) return JSON.parse(kv.value)._value ?? '';
    }
  } catch {
    // Unreadable session: fall through to the "no API token" error.
  }
  return '';
}

const live = (token: string) => (jwtExpiry(token.replace(/^Bearer\s+/i, '')) ?? 0) > Date.now();

function readToken(): string {
  const tokenEnv = process.env.VANNBROSPHASETWO_API_TOKEN?.trim()
    ? 'VANNBROSPHASETWO_API_TOKEN'
    : // Pre-rename name, still honoured so existing shells and CI keep working.
      process.env.AGRIERP_API_TOKEN?.trim()
      ? 'AGRIERP_API_TOKEN'
      : null;
  let raw = tokenEnv ? process.env[tokenEnv]!.trim() : '';
  let source = tokenEnv ?? '';
  if (!raw) {
    const fromFile = readTokenFile();
    const fromSession = readSessionToken();
    // A pasted token wins while it lasts; after that the session's always-fresh one takes over.
    if (fromFile && (live(fromFile) || !fromSession)) [raw, source] = [fromFile, TOKEN_FILE];
    else if (fromSession) [raw, source] = [fromSession, SESSION_FILE];
  }
  if (!raw) {
    throw new Error('no API token: run `pnpm auth:qa` to refresh the saved session, or set VANNBROSPHASETWO_API_TOKEN');
  }
  console.log(`Using API token from ${source}`);
  const token = raw.replace(/^Bearer\s+/i, '');
  const expiry = jwtExpiry(token);
  if (expiry === null) {
    throw new Error('API token is not a JWT; use the web app login token, not the one from Auth/signin');
  }
  if (expiry <= Date.now()) {
    throw new Error(`API token expired at ${new Date(expiry).toISOString()}; run \`pnpm auth:qa\` for a fresh one`);
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

  constructor({
    base = process.env.VANNBROSPHASETWO_API_BASE || process.env.AGRIERP_API_BASE || DEFAULT_BASE,
    timeoutMs = 60_000,
    token,
  }: { base?: string; timeoutMs?: number; token?: string } = {}) {
    if (!QA_HOST.test(base)) throw new Error(`refusing non-QA API base: ${base}`);
    this.base = base.replace(/\/$/, '');
    this.auth = token ? `Bearer ${token.trim().replace(/^Bearer\s+/i, '')}` : readToken();
    this.timeoutMs = timeoutMs;
  }

  get<T = unknown>(route: string, query: Record<string, string | number | undefined> = {}): Promise<T> {
    return this.send<T>('GET', route, query);
  }

  /** `timeoutMs` overrides the client default for one slow call (e.g. a large WO save). */
  post<T = unknown>(route: string, body: unknown, { timeoutMs }: { timeoutMs?: number } = {}): Promise<T> {
    return this.send<T>('POST', route, {}, body, timeoutMs);
  }

  put<T = unknown>(route: string, body: unknown): Promise<T> {
    return this.send<T>('PUT', route, {}, body);
  }

  patch<T = unknown>(route: string, body: unknown): Promise<T> {
    return this.send<T>('PATCH', route, {}, body);
  }

  /** Client acting as the operator (see OPERATOR_TOKEN_FILE). Throws when no token is saved. */
  static asOperator(opts: { base?: string; timeoutMs?: number } = {}): ApiClient {
    const token =
      process.env.VANNBROSPHASETWO_OPERATOR_TOKEN ||
      (existsSync(OPERATOR_TOKEN_FILE) ? readFileSync(OPERATOR_TOKEN_FILE, 'utf8') : '');
    if (!token.trim()) throw new Error(`no operator token: save one to ${OPERATOR_TOKEN_FILE}`);
    const exp = Number(JSON.parse(Buffer.from(token.trim().split('.')[1] ?? '', 'base64url').toString() || '{}').exp);
    if (exp && exp * 1000 < Date.now()) throw new Error(`operator token expired at ${new Date(exp * 1000).toISOString()}; paste a fresh one into ${OPERATOR_TOKEN_FILE}`);
    return new ApiClient({ ...opts, token });
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
