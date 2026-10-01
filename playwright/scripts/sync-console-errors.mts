/**
 * PRODUCTION Sync Console error report — READ-ONLY. Never retries, edits or deletes a message.
 *
 * 1. Signs in to https://vann-farms.agrierp.com (Microsoft SSO) in Firefox.
 * 2. Sync Console > Message Stats: turns on "Errors Only" and reads the jobs that have errors.
 * 3. Sync Console > Messages: for each of those jobs pulls every Error message and its
 *    Request Sessions (the wifi icon: request + response), the same data the UI shows.
 * 4. Writes an .xlsx: an Overview tab plus one tab per failing job.
 *
 *   pnpm prod:sync-errors                     report in the repo root
 *   pnpm prod:sync-errors --out ~/reports     choose the output folder
 *   pnpm prod:sync-errors --headed            watch the browser
 *
 * Credentials: PROD_SYNC_EMAIL / PROD_SYNC_PASSWORD, else the gitignored
 * .auth/production_farmappadmin_credentials.json ({ "email": "...", "password": "..." }).
 */
import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { resolve } from 'path';
import { parseArgs } from 'util';
import ExcelJS from 'exceljs';
import { firefox, type Page } from '@playwright/test';

const APP = 'https://vann-farms.agrierp.com';
const API = 'https://authgateway.agrierp.com/api';
const ERROR_STATUS = 6; // ComAXMessageStatus: 1 Pending, 2 ReAttempt, 3 InProcess, 4 Success, 5 Skip, 6 Error

const { values } = parseArgs({
  options: {
    out: { type: 'string', default: resolve(import.meta.dirname, '../..') },
    headed: { type: 'boolean', default: false },
  },
});

type StatRow = {
  connectionID: number; storeName: string; jobID: number; jobName: string;
  pending: number; reAttempt: number; inProcess: number; success: number; skipped: number; error: number; total: number;
};
type Message = {
  id: number; connectionName: string; jobID: number; jobName: string; statusName: string;
  createdAtZFormat: string; processingCount: number; lastActivityLog: string | null;
};
type Session = { id: number; messageID: number; request: string; response: string; requestDateTimeZFormat: string };

function credentials() {
  if (process.env.PROD_SYNC_EMAIL && process.env.PROD_SYNC_PASSWORD)
    return { email: process.env.PROD_SYNC_EMAIL, password: process.env.PROD_SYNC_PASSWORD };
  const file = resolve(import.meta.dirname, '../.auth/production_farmappadmin_credentials.json');
  if (!existsSync(file))
    throw new Error('No credentials: set PROD_SYNC_EMAIL/PROD_SYNC_PASSWORD or create .auth/production_farmappadmin_credentials.json');
  return JSON.parse(readFileSync(file, 'utf8')) as { email: string; password: string };
}

async function signIn(page: Page) {
  const { email, password } = credentials();
  // A fresh Firefox under WSL often fails its first DNS lookup (NS_ERROR_UNKNOWN_HOST); retry the page load.
  for (let attempt = 1; ; attempt++) {
    try { await page.goto(`${APP}/login`); break; } catch (e) {
      if (attempt === 3 || !/NS_ERROR_UNKNOWN_HOST/.test((e as Error).message)) throw e;
      await page.waitForTimeout(2000);
    }
  }
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByRole('button', { name: 'Login' }).click();
  await page.locator('input[type=password]').fill(password);
  await page.locator('input[type=submit]').click();
  await page.getByRole('button', { name: 'No' }).click(); // "Stay signed in?"
  await page.waitForURL(/\/maps/, { timeout: 90_000 }); // the app is ready only once it lands on Maps
}

/** Message Stats with "Errors Only" on; returns the failing jobs plus the Bearer token the page used. */
async function readErrorStats(page: Page) {
  // The page first calls /Message/stats?...&connectionID=0 (always empty), then without it (the real data).
  const statsResponse = page.waitForResponse((r) =>
    r.url().startsWith(`${API}/Message/stats`) && !r.url().includes('connectionID=') && r.ok());
  await page.goto(`${APP}/sync-console/stats`);
  const res = await statsResponse;
  const token = (await res.request().allHeaders()).authorization;
  // The checkbox input is hidden behind its label; clicking the label is what toggles it.
  await page.getByText('Errors Only', { exact: true }).click();
  await page.getByRole('button', { name: 'Tabular' }).click();
  await page.locator('table tbody tr').first().waitFor();
  const shown = await page.locator('table tbody tr').evaluateAll((rows) =>
    rows.map((r) => [...r.querySelectorAll('td')].map((td) => td.textContent!.trim())));
  const stats = ((await res.json()) as { data: StatRow[] }).data.filter((s) => s.error > 0);
  // The toggle filters client-side; the API rows are the same numbers, just typed.
  const onScreen = new Set(shown.filter((c) => c.length > 1).map((c) => c[1]));
  for (const s of stats) if (!onScreen.has(s.jobName)) console.warn(`  ! ${s.jobName} has errors in the API but is not on screen`);
  return { stats, token };
}

/** GET with a short re-read when the gateway returns an empty body (seen in practice). Reads only. */
async function get<T>(token: string, path: string): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${API}${path}`, { headers: { Authorization: token, Accept: 'application/json' } });
    const text = await res.text();
    if (res.ok && text) return JSON.parse(text) as T;
    if (attempt === 3) throw new Error(`GET ${path} -> ${res.status} ${text.slice(0, 200)}`);
    await new Promise((r) => setTimeout(r, 2000 * attempt));
  }
}

async function errorMessages(token: string, jobID: number) {
  const all: Message[] = [];
  for (let page = 1; ; page++) {
    const r = await get<{ data: Message[]; recordsTotal: number }>(
      token, `/Message?page=${page}&limit=100&jobIDs=${jobID}&messageStatus=${ERROR_STATUS}`);
    all.push(...r.data);
    if (!r.data.length || all.length >= r.recordsTotal) return all;
  }
}

// ---- formatting helpers: mirror what the Request Sessions dialog shows ----
const parse = (s: string) => { try { return JSON.parse(s); } catch { return undefined; } };

function requestText(raw: string) {
  const obj = parse(raw);
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    const keys = Object.keys(obj);
    if (keys.length === 1 && typeof obj[keys[0]] === 'object') return `${keys[0]}: Object\n${JSON.stringify(obj[keys[0]])}`;
    return JSON.stringify(obj);
  }
  return raw ?? '';
}

function responseText(raw: string) {
  const obj = parse(raw);
  if (!obj || typeof obj !== 'object') return raw ?? '';
  return Object.entries(obj)
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? `"${v.trim()}"` : JSON.stringify(v)}`)
    .join('\n');
}

function errorMessage(raw: string, fallback: string | null) {
  const obj = parse(raw);
  const msg = obj?.Message ?? obj?.message ?? obj?.title ?? obj?.error?.message ?? fallback ?? '';
  return String(msg).replace(/\t/g, '    ');
}

// Excel stores wall-clock time; shift UTC to this machine's zone so dates match the web app.
const local = (iso: string) => { const d = new Date(iso); d.setMilliseconds(0); return new Date(d.getTime() - d.getTimezoneOffset() * 60_000); };
const responseCode = (raw: string) => { const c = parse(raw)?.ResponseCode ?? parse(raw)?.status; return c === undefined ? '' : Number(c) || c; };

// ---- workbook ----
const FONT = 'Arial';
const HEADER = { font: { name: FONT, bold: true, size: 10, color: { argb: 'FFFFFFFF' } },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } } } as const;
const thin = { style: 'thin', color: { argb: 'FFBFBFBF' } } as const;
const BORDER = { top: thin, left: thin, bottom: thin, right: thin };

function table(ws: ExcelJS.Worksheet, columns: { header: string; width: number; fmt?: string }[], rows: unknown[][]) {
  ws.columns = columns.map((c) => ({ header: c.header, width: c.width, style: c.fmt ? { numFmt: c.fmt } : {} }));
  ws.addRows(rows);
  ws.eachRow((row, n) => row.eachCell({ includeEmpty: true }, (cell) => {
    cell.border = BORDER;
    if (n === 1) {
      Object.assign(cell, HEADER);
      cell.alignment = { wrapText: true, horizontal: 'center', vertical: 'middle' };
    } else {
      cell.font = { name: FONT, size: 9 };
      cell.alignment = { wrapText: true, vertical: 'top' };
    }
  }));
  ws.getRow(1).height = 30;
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
}

function tabName(job: string, used: Set<string>) {
  let name = job.replace(/[\\/?*[\]:]/g, '').slice(0, 31);
  for (let i = 2; used.has(name.toLowerCase()); i++) name = `${job.slice(0, 31 - String(i).length - 1)}~${i}`;
  used.add(name.toLowerCase());
  return name;
}

// ---- run ----
const browser = await firefox.launch({ headless: !values.headed });
try {
  const page = await browser.newPage();
  console.log('Signing in to production…');
  await signIn(page);
  const { stats, token } = await readErrorStats(page);
  await page.goto(`${APP}/sync-console/messages`); // the page the report mirrors; data comes from its API
  console.log(stats.length ? `Jobs with errors: ${stats.map((s) => `${s.jobName} (${s.error})`).join(', ')}` : 'No jobs with errors.');

  const wb = new ExcelJS.Workbook();
  wb.creator = 'production-sync-console-error-logger';
  const overview = wb.addWorksheet('Overview');
  const used = new Set(['overview']);
  const overviewRows: unknown[][] = [];

  for (const s of stats) {
    const messages = await errorMessages(token, s.jobID);
    const rows: unknown[][] = [];
    let n = 0;
    for (const m of messages) {
      const sessions = await get<Session[]>(token, `/Message/${m.id}/RequestResponse`);
      n++;
      const base = [n, m.id, m.connectionName, m.jobName.trim(), m.statusName, local(m.createdAtZFormat)];
      if (!sessions.length) rows.push([...base, '', '', errorMessage('', m.lastActivityLog), '', '']);
      // Newest session first, as the dialog lists them; one row per session.
      for (const x of [...sessions].sort((a, b) => b.id - a.id))
        rows.push([...base, x.id, responseCode(x.response), errorMessage(x.response, m.lastActivityLog),
          requestText(x.request), responseText(x.response)]);
    }
    const name = tabName(messages[0]?.jobName.trim() || s.jobName, used);
    const ws = wb.addWorksheet(name);
    table(ws, [
      { header: '#', width: 5 }, { header: 'Message ID', width: 10 }, { header: 'Store Name', width: 13 },
      { header: 'Service Name', width: 30 }, { header: 'Status', width: 9 },
      { header: 'Date', width: 16, fmt: 'mm/dd/yyyy hh:mm' }, { header: 'Request Session ID', width: 11 },
      { header: 'Response Code', width: 10 }, { header: 'Error Message', width: 38 },
      { header: 'Request', width: 70 }, { header: 'Response', width: 90 },
    ], rows);
    for (let r = 2; r <= ws.rowCount; r++) ws.getRow(r).height = 150;
    overviewRows.push([s.storeName, s.jobName, s.error, { text: name, hyperlink: `#'${name}'!A1` }]);
    if (messages.length !== s.error) console.warn(`  ! ${name}: stats say ${s.error} errors, extracted ${messages.length}`);
    console.log(`  ${name}: ${messages.length} error message(s)`);
  }

  table(overview, [
    { header: 'Store Name', width: 14 }, { header: 'Job Name', width: 34 }, { header: 'Error', width: 9 },
    { header: 'Tab', width: 34 },
  ], overviewRows);
  const last = overviewRows.length + 1;
  if (overviewRows.length) {
    const total = overview.addRow(['Total', '', { formula: `SUM(C2:C${last})` }]);
    total.eachCell({ includeEmpty: true }, (c) => { c.font = { name: FONT, bold: true, size: 9 }; c.border = BORDER; });
  }
  for (let r = 2; r <= last; r++) overview.getCell(`D${r}`).font = { name: FONT, size: 9, color: { argb: 'FF0563C1' }, underline: true };
  const stamp = new Date();
  overview.addRow([]);
  overview.addRow([`Source: ${APP}/sync-console/stats (Errors Only) and /sync-console/messages, Status = Error, with each `
    + `message's Request Sessions. Extracted ${stamp.toLocaleString('en-US')} (dates in this machine's time zone). Read-only: nothing was retried.`])
    .getCell(1).font = { name: FONT, italic: true, size: 8, color: { argb: 'FF595959' } };

  const ts = `${local(stamp.toISOString()).toISOString().slice(0, 16).replace('T', '_').replace(':', '')}`;
  const out = resolve(values.out!.replace(/^~/, homedir()), `AgriERP_SyncConsole_Errors_${ts}.xlsx`);
  await wb.xlsx.writeFile(out);
  console.log(`Report: ${out}`);
} catch (e) {
  console.error(`prod:sync-errors failed: ${(e as Error).message}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
