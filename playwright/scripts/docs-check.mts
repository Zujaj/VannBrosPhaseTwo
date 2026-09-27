/**
 * Docs drift check: fails when the repo's hand-written guides point at things that no longer exist.
 *
 *     pnpm docs:check
 *
 * Checks, in each file listed in DOCS:
 * - every `pnpm <script>` in code (backticks or a fenced block) names a script in playwright/ or
 *   documentation/ package.json, or a pnpm built-in such as `install` / `exec`;
 * - every relative markdown link `[..](path)` resolves to a file or directory;
 * - every backticked repo path (`playwright/...`, `tests/...`, `resources/...`) exists.
 *
 * Deterministic and offline, so it runs in CI next to `pnpm coverage`. It does not judge
 * whether prose is current; it catches the renames and moves that silently break a guide.
 */
import { existsSync, readFileSync } from 'fs';
import path from 'path';

const PKG = path.resolve(import.meta.dirname, '..');
const REPO = path.resolve(PKG, '..');

const DOCS = [
  'README.md',
  'CLAUDE.md',
  'playwright/ARCHITECTURE.md',
  '.claude/skills/vannbrosphasetwo-playwright/SKILL.md',
];

const PNPM_BUILTINS = new Set(['install', 'i', 'add', 'remove', 'exec', 'run', 'dlx', 'update', 'test']);

const scripts = new Set<string>(PNPM_BUILTINS);
for (const pkg of ['playwright', 'documentation']) {
  const json = JSON.parse(readFileSync(path.join(REPO, pkg, 'package.json'), 'utf8'));
  Object.keys(json.scripts ?? {}).forEach((s) => scripts.add(s));
}

// Where a backticked path is rooted: repo-level folders resolve from the repo root.
const REPO_ROOTS = ['playwright/', 'documentation/', 'resources/', '.claude/', '.github/'];
// The suite's own folders (as the playwright docs write them) resolve from either package, since
// the docs also say `scripts/generate-pdf.ts` for documentation/.
const PKG_ROOTS = ['tests/', 'scripts/', 'test-plans/', 'api/'];
const PKGS = [PKG, path.join(REPO, 'documentation')];

const problems: string[] = [];

for (const doc of DOCS) {
  const file = path.join(REPO, doc);
  if (!existsSync(file)) {
    problems.push(`${doc}: file is listed in docs-check but missing`);
    continue;
  }
  const lines = readFileSync(file, 'utf8').split('\n');
  let fenced = false;
  lines.forEach((line, i) => {
    const at = `${doc}:${i + 1}`;
    if (line.trimStart().startsWith('```')) fenced = !fenced;

    // Only code counts: prose like "use pnpm only" is not a command.
    const code = fenced ? [line] : [...line.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
    for (const span of code) {
      for (const [, name] of span.matchAll(/\bpnpm ([a-z][\w-]*(?::[\w-]+)*)/g)) {
        if (!scripts.has(name)) problems.push(`${at}: unknown script \`pnpm ${name}\``);
      }
    }

    for (const [, target] of line.matchAll(/\]\(([^)\s]+)\)/g)) {
      if (/^(https?:|mailto:|#)/.test(target)) continue;
      const rel = decodeURI(target.split('#')[0]);
      if (!existsSync(path.resolve(path.dirname(file), rel))) problems.push(`${at}: broken link \`${target}\``);
    }

    for (const [, p] of line.matchAll(/`([.\w][^`\s]*\/[^`\s]*)`/g)) {
      if (/[<>*{}$|]|\.\.\./.test(p)) continue; // placeholders and globs, not literal paths
      const bases = REPO_ROOTS.some((r) => p.startsWith(r)) ? [REPO] : PKG_ROOTS.some((r) => p.startsWith(r)) ? PKGS : [];
      const rel = p.split('#')[0];
      if (bases.length && !bases.some((b) => existsSync(path.join(b, rel)))) problems.push(`${at}: missing path \`${p}\``);
    }
  });
}

if (problems.length) {
  console.error(`docs-check: ${problems.length} problem(s)\n${problems.map((p) => `  ${p}`).join('\n')}`);
  process.exit(1);
}
console.log(`docs-check: ${DOCS.length} files OK`);
