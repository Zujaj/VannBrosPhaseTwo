#!/usr/bin/env node
/**
 * Minimal client for the AgriERP custom services in Dynamics 365 Finance & Operations (FinOps),
 * mirroring the "FinOps" folder of the AgriERP Product Postman collection.
 *
 *   node finops.mjs check                                   # inspect the token locally (host, expiry); no call
 *   node finops.mjs get <Service> [--size 10000] [--since ISO] [--id 0] [--page 1]
 *                                                           # e.g. get F3AgriCropServices
 *   node finops.mjs call <path> --body file.json [--yes]    # any service, body from a JSON file
 *
 * <Service> is the service class under F3AgriERPServices (F3AgriCropServices, F3AgriSeasonServices,
 * F3AgriProjectService, F3AgriUnitOfConversion, …). <path> is everything after the app URL, e.g.
 * /api/services/F3AgriERPServices/F3AgriJournalService/createProjectItemJournal.
 *
 * Only operations named `get` run without `--yes`. Anything else (create, createProject,
 * createOrUpdateWO, createProjectItemJournal, itemReturn) writes to the shared D365 company and
 * prints a dry run unless `--yes` is given.
 *
 * Auth. The services want `Authorization: Bearer <token>`, the Entra ID access token the Postman
 * "Auth" request saves as {{agrierp_fno_access_token}}. It lasts about an hour. The token is not
 * minted here; a person supplies it (first match wins):
 *
 *   1. `FINOPS_API_TOKEN` environment variable
 *   2. `playwright/.auth/qa_finops_token.txt` (gitignored), a file holding just the token — or a JSON
 *      object with an `access_token` or `token` field, so pasting the whole token response works too
 *
 * Either may include the `Bearer ` prefix or not. The D365 host is read from the token's `aud`
 * claim (the token is scoped to {{AppUrl}}); `FINOPS_APP_URL` overrides it.
 * `FINOPS_LEGAL_ENTITY` overrides the default legal entity `vbs`. Nothing here prints the token.
 * Node >= 20, no dependencies.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const REPO = path.resolve(import.meta.dirname, '../../../..');
const TOKEN_FILE = path.join(REPO, 'playwright', '.auth', 'qa_finops_token.txt');

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function readToken() {
  let raw = (process.env.FINOPS_API_TOKEN ?? (existsSync(TOKEN_FILE) ? readFileSync(TOKEN_FILE, 'utf8') : '')).trim();
  if (raw.startsWith('{')) {
    const json = JSON.parse(raw);
    raw = String(json.access_token ?? json.token ?? '').trim();
  }
  raw = raw.replace(/^Bearer\s+/i, '');
  if (!raw) fail(`No FinOps token. Set FINOPS_API_TOKEN or paste it into ${path.relative(REPO, TOKEN_FILE)}.`);
  return raw;
}

function claimsOf(token) {
  const parts = token.split('.');
  if (parts.length !== 3) fail('FinOps token is not a JWT (expected three dot-separated parts). Copy it again.');
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    fail('FinOps token payload does not decode. Copy it again.');
  }
}

function config() {
  const token = readToken();
  const claims = claimsOf(token);
  const secondsLeft = Math.floor((claims.exp ?? 0) - Date.now() / 1000);
  if (secondsLeft <= 0) fail(`FinOps token expired ${-secondsLeft}s ago. Fetch a fresh one (Postman "Auth" request).`);
  const appUrl = (process.env.FINOPS_APP_URL ?? claims.aud ?? '').replace(/\/+$/, '');
  if (!/^https:\/\//.test(appUrl)) fail(`Can't tell the D365 host from the token (aud: ${claims.aud}). Set FINOPS_APP_URL.`);
  // Non-production only. D365 sandboxes live on *.sandbox.operations.dynamics.com and dev boxes on
  // *.cloudax.dynamics.com / *.axcloud.dynamics.com (the VBS QA AOS is
  // vb-qa-…devaos.axcloud.dynamics.com); a bare *.operations.dynamics.com host is usually production.
  const host = new URL(appUrl).host;
  const nonProd = /\.sandbox\.operations\.dynamics\.com$|\.(cloudax|axcloud)\.dynamics\.com$/i.test(host) && !/prod/i.test(host);
  if (!nonProd && process.env.FINOPS_ALLOW_HOST !== host) {
    fail(`Refusing ${host}: not a recognised non-production D365 host. If it really is a test environment, set FINOPS_ALLOW_HOST=${host}.`);
  }
  return { token, appUrl, host, secondsLeft, legalEntity: process.env.FINOPS_LEGAL_ENTITY ?? 'vbs', appId: claims.appid };
}

async function post(c, servicePath, body) {
  let res;
  try {
    res = await fetch(c.appUrl + servicePath, {
      method: 'POST',
      headers: { Authorization: `Bearer ${c.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const code = err.cause?.code ?? err.code;
    if (code === 'CERT_HAS_EXPIRED') {
      fail(`${c.host} presents an expired TLS certificate (CERT_HAS_EXPIRED). The D365 admin has to renew it (LCS: Rotate secrets > SSL certificates); see SKILL.md.`);
    }
    fail(`POST ${servicePath} failed before a response: ${code ?? ''} ${err.cause?.message ?? err.message}`);
  }
  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }
  if (res.status === 401) fail(`401 from POST ${servicePath}: token rejected (expired, wrong environment, or app not registered in D365).`);
  if (!res.ok) fail(`${res.status} from POST ${servicePath}: ${typeof parsed === 'string' ? parsed.slice(0, 500) : JSON.stringify(parsed).slice(0, 500)}`);
  return parsed;
}

function flag(args, name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
}

const [cmd, target, ...rest] = process.argv.slice(2);
const args = [target, ...rest].filter((a) => a !== undefined);

if (cmd === 'check') {
  const c = config();
  console.log(`OK: token for ${c.host}, legal entity ${c.legalEntity}, expires in ${c.secondsLeft}s.`);
} else if (cmd === 'get' && target) {
  const c = config();
  const doc = {
    ID: Number(flag(args, 'id', 0)),
    DateTime: flag(args, 'since', '2000-01-01T00:00:00Z'),
    // 10000 by default: on QA, PageNo is ignored and PageSize caps rows scanned *before* filtering
    // (crops: size 100 → 3 of 6), so small pages silently drop rows. See SKILL.md "Observed responses".
    PageSize: Number(flag(args, 'size', 10000)),
    PageNo: Number(flag(args, 'page', 1)),
    LegalEntity: c.legalEntity,
  };
  console.log(JSON.stringify(await post(c, `/api/services/F3AgriERPServices/${target}/get`, { doc }), null, 2));
} else if (cmd === 'call' && target?.startsWith('/api/services/')) {
  const file = flag(args, 'body');
  if (!file) fail('call needs --body <file.json>');
  const body = JSON.parse(readFileSync(file, 'utf8'));
  const readOnly = target.split('/').pop() === 'get';
  if (!readOnly && !args.includes('--yes')) {
    console.log(`DRY RUN — would POST ${target} with:\n${JSON.stringify(body, null, 2)}\nRe-run with --yes to send it.`);
    process.exit(0);
  }
  console.log(JSON.stringify(await post(config(), target, body), null, 2));
} else {
  fail(readFileSync(import.meta.filename, 'utf8').match(/\/\*\*([\s\S]*?)\*\//)[1].replace(/^ \* ?/gm, ''));
}
