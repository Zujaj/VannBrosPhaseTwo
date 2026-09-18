/**
 * One-time import of the QA team's plaintext account list into the gitignored
 * `.auth/credentials.json` the suite actually reads.
 *
 *     pnpm creds:import [path/to/creds.txt]
 *
 * The source file (repo root `creds.txt` by default) is untracked but was NOT gitignored —
 * one `git add -A` from publishing every QA password. It is ignored now; this script exists
 * so it can be moved out of the repo altogether, with the suite reading a single file under
 * the already-ignored `.auth/`.
 *
 * Role assignment is deliberately conservative. The source file labels only a few accounts
 * ("QA Admin user", "Farm Hand", "Farm Manager"); the rest are grouped by the tester who
 * owns them, which says nothing about their VannBrosPhaseTwo permissions. Guessing would produce
 * permission tests that fail for the wrong reason, so unlabelled accounts land in
 * `_unassigned` with the heading they appeared under, for a human to place.
 *
 * Nothing here prints a password, and no password is written outside `.auth/`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import ROLE_PROFILES from '../tests/constants/roles.json' with { type: 'json' };

// The role table is read from JSON rather than from `tests/constants/roles.ts`: the package
// is CommonJS, so Node loads that module as CJS and an ESM script cannot import its named
// exports. `roles.ts` reads the same file, so there is one source of truth.
type Role = keyof typeof ROLE_PROFILES;
const ROLES = Object.keys(ROLE_PROFILES) as Role[];

const ROOT = path.resolve(import.meta.dirname, '..');
const REPO_ROOT = path.resolve(ROOT, '..');
const DEFAULT_SOURCE = path.join(REPO_ROOT, 'creds.txt');
const OUT = path.join(ROOT, '.auth', 'credentials.json');

const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/**
 * Headings in the source file that name an VannBrosPhaseTwo role rather than a person.
 * Matched case-insensitively against the nearest preceding label.
 */
const HEADING_TO_ROLE: ReadonlyArray<readonly [RegExp, Role]> = [
  [/qa admin user/i, 'admin'],
  [/farm ?hand/i, 'farmhand'],
];

interface Account {
  username: string;
  password: string;
  heading: string;
}

function parse(text: string): Account[] {
  // Structure is positional: a line holding an email address, then the next non-empty line
  // is its password. Section headings are any other non-empty, non-separator line.
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const accounts: Account[] = [];
  let heading = '';

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line || /^_+$/.test(line)) continue;

    if (EMAIL.test(line)) {
      const password = lines.slice(i + 1).find((l) => l && !/^_+$/.test(l));
      // An email with no following password line is an incomplete entry, not an error.
      if (password && !EMAIL.test(password)) {
        accounts.push({ username: line, password, heading });
      }
      continue;
    }
    // A URL line ("QA - Farm App Url: https://...") is not a heading worth carrying.
    if (!/https?:\/\//.test(line)) heading = line.replace(/:$/, '').trim();
  }
  return accounts;
}

function mask(username: string): string {
  const [local, domain] = username.split('@');
  return domain ? `${local.slice(0, 4)}***@${domain}` : `${local.slice(0, 4)}***`;
}

const source = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_SOURCE;
if (!existsSync(source)) {
  console.error(`No credentials file at ${source}`);
  process.exit(1);
}

const accounts = parse(readFileSync(source, 'utf-8'));
if (!accounts.length) {
  console.error(`No account/password pairs found in ${source}`);
  process.exit(1);
}

// Preserve any role already assigned by hand — re-running the import must not undo a
// mapping a human made after the first run.
const existing: Record<string, unknown> = existsSync(OUT)
  ? JSON.parse(readFileSync(OUT, 'utf-8'))
  : {};

const assigned: Record<string, { username: string; password: string }> = {};
const unassigned: Array<{ username: string; password: string; heading: string }> = [];

/** The role this account is already mapped to in `.auth/credentials.json`, if any. */
const manualRole = (account: Account) =>
  ROLES.find((role) => (existing[role] as { username?: string } | undefined)?.username === account.username);

// Two passes, because a manual assignment must beat the heading rules.
//
// The source file labels `f3-agrierp-04` as "Farm Hand", but that account cannot sign in
// (Azure AD demands a password change), so the team nominated a different one. A single pass
// in file order let the labelled account claim the `farmhand` slot first and silently undo
// that decision on the next import — the password refreshed, the person did not.
for (const account of accounts) {
  const role = manualRole(account);
  if (role) assigned[role] = { username: account.username, password: account.password };
}
for (const account of accounts) {
  if (manualRole(account)) continue;
  const matched = HEADING_TO_ROLE.find(([pattern]) => pattern.test(account.heading))?.[1];
  if (matched && !assigned[matched]) {
    assigned[matched] = { username: account.username, password: account.password };
  } else {
    unassigned.push(account);
  }
}

mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(
  OUT,
  JSON.stringify(
    {
      _README: [
        'Gitignored. Read by tests/helpers/credentials.ts to bootstrap sessions without a',
        'human at the SSO prompt. Environment variables (VANNBROSPHASETWO_<ROLE>_USER / _PASS) take',
        'precedence over this file and are what CI should use.',
        'Move an entry out of _unassigned into a role key to enable that role.',
        `Known roles: ${ROLES.join(', ')}`,
      ],
      ...assigned,
      _unassigned: unassigned,
    },
    null,
    2,
  ) + '\n',
);

console.log(`Parsed ${accounts.length} accounts from ${path.relative(REPO_ROOT, source)}`);
console.log(`Wrote ${path.relative(REPO_ROOT, OUT)} (gitignored)\n`);
console.log('Assigned roles:');
for (const role of ROLES) {
  const entry = assigned[role];
  if (entry) console.log(`  ${role.padEnd(20)} ${mask(entry.username)}  — ${ROLE_PROFILES[role].description}`);
}
const missing = ROLES.filter((r) => ROLE_PROFILES[r].bootstrappable && !assigned[r]);
if (missing.length) {
  console.log(`\nStill unassigned (${unassigned.length} accounts available): ${missing.join(', ')}`);
  console.log('The source file does not say which account holds which VannBrosPhaseTwo permissions —');
  console.log(`assign them by editing ${path.relative(REPO_ROOT, OUT)}.`);
}
