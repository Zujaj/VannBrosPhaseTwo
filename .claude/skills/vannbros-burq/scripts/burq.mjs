#!/usr/bin/env node
/**
 * Read-only client for the Burq Web API (VANNBROS.QA, https://vannbros-qa.burqio.site).
 *
 *   node burq.mjs check                          # inspect the token locally (expiry, user); no call
 *   node burq.mjs get <path> [k=v ...]           # any GET, e.g. get /api/v1/Dataflows/options WorkspaceId=12
 *   node burq.mjs packets <dataflowId> [--status 3] [--search HT-290-JJZIQ-26] [--from ISO] [--to ISO]
 *                        [--size 25] [--page 0] [--full]
 *                                                # Transactions grid rows for one dataflow, newest first
 *
 * <path> is copied from reference/*.md; `{version}` becomes 1. Repeat a key for array params
 * (`Status=2 Status=3`). Prints the JSON response to stdout.
 *
 * Only GET is supported, on purpose: POST/PUT/DELETE resync, restart or reconfigure dataflows and
 * can re-send data to WMS or D365. The GETs in SIDE_EFFECT_GETS write despite the verb and are
 * refused too.
 *
 * Auth. `Authorization: Bearer <token>`, the JWT the web app keeps in localStorage `authToken`.
 * It is not minted here (login needs an emailed 2FA code); a person supplies it (first match wins):
 *
 *   1. `BURQ_API_TOKEN` environment variable
 *   2. `playwright/.auth/vannbros_qa_burq_token.txt` (gitignored), a file holding just the token
 *
 * Either may include the `Bearer ` prefix or not. `BURQ_API_BASE` overrides the base URL; it must
 * still be a QA Burq host. Nothing here prints the token. Node >= 20, no dependencies.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const REPO = path.resolve(import.meta.dirname, '../../../..');
const TOKEN_FILE = path.join(REPO, 'playwright', '.auth', 'vannbros_qa_burq_token.txt');
const BASE = (process.env.BURQ_API_BASE ?? 'https://vannbros-qa.burqio.site').replace(/\/+$/, '');
const CLAIM = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/';

// GET routes that change state or hand out credentials.
const SIDE_EFFECT_GETS = [
  /\/DynamicMapping\/SaveJson/i,
  /\/Webhook\/generate\//i,
  /\/Notification\/SkipNotifications/i,
  /\/identity\/user\/confirm-email/i,
  /\/ConnectorScaling\/test-/i,
  /\/AzureAd\b/i,
  /^\/connect\//i,
];

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function readToken() {
  const raw = (process.env.BURQ_API_TOKEN ?? (existsSync(TOKEN_FILE) ? readFileSync(TOKEN_FILE, 'utf8') : ''))
    .trim()
    .replace(/^Bearer\s+/i, '');
  if (!raw) fail(`No Burq token. Set BURQ_API_TOKEN or paste it into ${path.relative(REPO, TOKEN_FILE)}.`);
  const parts = raw.split('.');
  if (parts.length !== 3) fail('Burq token is not a JWT (expected three dot-separated parts). Copy it again.');
  let claims;
  try {
    claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    fail('Burq token payload does not decode. Copy it again.');
  }
  const secondsLeft = Math.floor((claims.exp ?? 0) - Date.now() / 1000);
  if (secondsLeft <= 0) fail(`Burq token expired ${-secondsLeft}s ago. Fetch a fresh one (see SKILL.md, REST API).`);
  return { token: raw, claims, secondsLeft };
}

function guardBase() {
  if (!/^https:\/\/[a-z-]*qa[a-z-]*\.burqio\.site$/.test(BASE)) fail(`Refusing non-QA Burq base: ${BASE}`);
}

async function get(route, params) {
  guardBase();
  const p = route.replace('{version}', '1');
  if (!p.startsWith('/')) fail(`Path must start with "/": ${route}`);
  if (/\{[^}]+\}/.test(p)) fail(`Fill in the path parameters: ${p}`);
  if (SIDE_EFFECT_GETS.some((re) => re.test(p))) fail(`Refusing ${p}: this GET has side effects (see SKILL.md).`);
  const { token } = readToken();
  const url = new URL(BASE + p);
  for (const [k, v] of params) url.searchParams.append(k, v);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
  const text = await res.text();
  if (!res.ok) fail(`HTTP ${res.status} ${res.statusText} for GET ${url.pathname}${url.search}\n${text.slice(0, 2000)}`);
  // Unknown routes (and non-GET routes) fall through to the Blazor app's index.html with a 200.
  if (/^\s*<!DOCTYPE html/i.test(text)) fail(`GET ${url.pathname} returned the web app's HTML: no such GET route. Check reference/*.md.`);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function flags(args) {
  const out = {};
  for (let i = 0; i < args.length; i++) {
    if (!args[i].startsWith('--')) continue;
    const k = args[i].slice(2);
    out[k] = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
  }
  return out;
}

const [cmd, ...rest] = process.argv.slice(2);
switch (cmd) {
  case 'check': {
    guardBase();
    const { claims, secondsLeft } = readToken();
    console.log(JSON.stringify({
      base: BASE,
      user: claims[`${CLAIM}emailaddress`] ?? claims[`${CLAIM}name`],
      role: claims['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'],
      expires: new Date(claims.exp * 1000).toISOString(),
      minutesLeft: Math.floor(secondsLeft / 60),
    }, null, 2));
    break;
  }
  case 'get': {
    const [route, ...kv] = rest;
    if (!route) fail('usage: burq.mjs get <path> [k=v ...]');
    const params = kv.map((s) => {
      const i = s.indexOf('=');
      if (i < 1) fail(`Expected k=v, got "${s}"`);
      return [s.slice(0, i), s.slice(i + 1)];
    });
    console.log(JSON.stringify(await get(route, params), null, 2));
    break;
  }
  case 'packets': {
    const [flow, ...more] = rest;
    if (!/^\d+$/.test(flow ?? '')) fail('usage: burq.mjs packets <dataflowId> [--status N] [--search text] [--from ISO] [--to ISO] [--size 25] [--page 0] [--full]');
    const f = flags(more);
    const params = [
      ['ServiceIds', flow],
      ['PageNumber', String(f.page ?? 0)],
      ['PageSize', String(f.size ?? 25)],
      ['IsASC', 'false'],
      ['MatchPhrase', 'false'],
      ['OrderByFieldName', 'DateModified'],
    ];
    if (f.status) for (const s of String(f.status).split(',')) params.push(['Status', s]);
    if (f.search) params.push(['SearchString', String(f.search)]);
    if (f.from) params.push(['FromDate', String(f.from)]);
    if (f.to) params.push(['ToDate', String(f.to)]);
    const res = await get('/api/v1/DataPacket/dataPackets', params);
    const STATUS = ['Default', 'InQueue', 'Success', 'Error', 'Resync', 'ReQueued', 'Refetch', 'Archive'];
    const rows = (res.data ?? []).map((r) => {
      const row = {
        id: r.id,
        status: STATUS[r.status] ?? r.status,
        sourceID: r.sourceID,
        destinationID: r.destinationID,
        detail: r.detail,
        date: r.date,
        dataflow: r.serviceName,
      };
      // `data` is a JSON string whose Syncable.Json is another JSON string (GET / POST / UPDATE steps).
      if (f.full) {
        try {
          const d = JSON.parse(r.data);
          row.run = d.Syncable?.Json ? JSON.parse(d.Syncable.Json) : d;
        } catch {
          row.data = r.data;
        }
      }
      return row;
    });
    console.log(JSON.stringify({ totalCount: res.totalCount, currentPage: res.currentPage, totalPages: res.totalPages, rows }, null, 2));
    break;
  }
  default:
    fail('usage: burq.mjs check | get <path> [k=v ...] | packets <dataflowId> [flags]');
}
