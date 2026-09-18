/**
 * Coverage report: which regression-workbook cases the automated suite actually covers.
 *
 *     pnpm coverage          # print the table
 *     pnpm coverage --write  # also refresh test-plans/COVERAGE.md
 *
 * Specs declare coverage with a tag in the test title:
 *
 *     test('@TC:WT-001 weather section renders empty before job start', ...)      // full
 *     test('@TC-partial:WP-049 creates and submits a Planned work order', ...)    // partial
 *
 * `@TC:` means the automated test asserts the workbook case's ENTIRE expected result.
 * `@TC-partial:` means it exercises the flow but leaves part of the expected result
 * unasserted — e.g. the planned happy path creates a work order and checks the success
 * toast, but never asserts WP-049's "status changes to To Do". Partials are reported in
 * their own column and do NOT count towards the covered percentage: a case whose expected
 * result is half-checked will not catch the regression it exists to catch, and rolling it
 * into the headline number would hide exactly the gap this report is for.
 *
 * A test may carry several tags when one flow genuinely touches several cases (the planned
 * happy path adds a plot, a material, a resource and an asset on the way to submitting).
 * Playwright's own `--grep` reads these same tags, so `--grep @TC:WT-001` runs exactly that
 * case — which is what makes a workbook row traceable to a run.
 *
 * The denominator is deliberately the AUTOMATABLE web subset, not all 633 web cases:
 * reporting against cases that need a physical iPhone or a D365 posting batch would make
 * the number permanently and uninformatively low. Exclusions are listed per module so the
 * manual scope stays visible rather than disappearing.
 */
import { readFileSync, readdirSync, writeFileSync } from 'fs';
import path from 'path';

// `.mts` so Node runs this as ESM (the package is CommonJS) and can strip the types
// natively — no ts-node/tsx dependency for a script that only reads files.

interface WorkbookCase {
  tab: string;
  id: string;
  module: string;
  subProcess: string;
  platform: string;
  prerequisite: string;
  title: string;
  steps: string;
  expected: string;
  priority: string;
  type: string;
  estimateMinutes: string;
}

const ROOT = path.resolve(import.meta.dirname, '..');
const CATALOG = path.join(ROOT, 'test-plans', 'catalog', 'web-cases.json');
const TESTS_DIR = path.join(ROOT, 'tests');
const OUT_MD = path.join(ROOT, 'test-plans', 'COVERAGE.md');

/** Types the workbook itself scopes to human judgement or a device lab. */
const MANUAL_TYPES = new Set(['Performance', 'Compatibility', 'Accessibility', 'Usability']);
const NEEDS_DEVICE = /\bios\b|mobile app|iphone|ipad|offline/i;
const NEEDS_D365 = /d365|dynamics|posting|batch job|\berp\b/i;

type Exclusion = 'cross-platform' | 'device' | 'd365' | 'nfr' | null;

/**
 * Why a web case can't be asserted by a browser alone — or `null` when it can.
 * Mirrors the triage in the revamp analysis; keep the two in step if either changes.
 */
function excludedBecause(c: WorkbookCase): Exclusion {
  if (c.platform !== 'Web') return 'cross-platform';
  if (MANUAL_TYPES.has(c.type)) return 'nfr';
  const blob = `${c.title} ${c.steps} ${c.expected} ${c.prerequisite}`;
  if (NEEDS_DEVICE.test(blob)) return 'device';
  if (NEEDS_D365.test(blob)) return 'd365';
  return null;
}

function specFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return specFiles(full);
    return entry.name.endsWith('.spec.ts') ? [full] : [];
  });
}

/** Map every `@TC:` / `@TC-partial:` tag in the suite to the spec files that declare it. */
function taggedCases(): { full: Map<string, string[]>; partial: Map<string, string[]> } {
  const full = new Map<string, string[]>();
  const partial = new Map<string, string[]>();
  for (const file of specFiles(TESTS_DIR)) {
    const rel = path.relative(ROOT, file);
    for (const m of readFileSync(file, 'utf-8').matchAll(/@TC(-partial)?:([A-Z]{2,3}-\d{3})/g)) {
      const target = m[1] ? partial : full;
      const files = target.get(m[2]) ?? [];
      if (!files.includes(rel)) files.push(rel);
      target.set(m[2], files);
    }
  }
  return { full, partial };
}

const catalog = JSON.parse(readFileSync(CATALOG, 'utf-8')) as {
  _meta: Record<string, unknown>;
  cases: WorkbookCase[];
};
const { full: tagged, partial: taggedPartial } = taggedCases();
const byId = new Map(catalog.cases.map((c) => [c.id, c]));

// A tag that matches no workbook row is a typo or a stale ID — surface it loudly, because
// silently ignoring it would inflate nothing but would hide a broken traceability link.
const orphanTags = [...tagged.keys(), ...taggedPartial.keys()].filter((id) => !byId.has(id));

// A case tagged both ways is ambiguous — the full tag would silently win. Fail instead.
const doubleTagged = [...tagged.keys()].filter((id) => taggedPartial.has(id));

const webCases = catalog.cases.filter((c) => c.platform.includes('Web'));
const automatable = webCases.filter((c) => excludedBecause(c) === null);

interface ModuleRow {
  tab: string;
  automatable: number;
  automatableP1: number;
  covered: number;
  coveredP1: number;
  partial: number;
  excluded: number;
}

const modules = new Map<string, ModuleRow>();
for (const c of webCases) {
  const row = modules.get(c.tab) ?? {
    tab: c.tab, automatable: 0, automatableP1: 0, covered: 0, coveredP1: 0, partial: 0, excluded: 0,
  };
  if (excludedBecause(c) !== null) {
    row.excluded += 1;
  } else {
    row.automatable += 1;
    if (c.priority === 'P1') row.automatableP1 += 1;
    if (tagged.has(c.id)) {
      row.covered += 1;
      if (c.priority === 'P1') row.coveredP1 += 1;
    } else if (taggedPartial.has(c.id)) {
      row.partial += 1;
    }
  }
  modules.set(c.tab, row);
}

const coveredTotal = automatable.filter((c) => tagged.has(c.id)).length;
const partialTotal = automatable.filter((c) => !tagged.has(c.id) && taggedPartial.has(c.id)).length;
const coveredP1 = automatable.filter((c) => c.priority === 'P1' && tagged.has(c.id)).length;
const automatableP1 = automatable.filter((c) => c.priority === 'P1').length;
const pct = (n: number, d: number) => (d === 0 ? '—' : `${((n / d) * 100).toFixed(1)}%`);

const lines: string[] = [];
lines.push('# Automation coverage vs. the Vann Brothers regression suite');
lines.push('');
lines.push('> Generated by `pnpm coverage --write`. Do not edit by hand.');
lines.push(`> Source: \`${catalog._meta.source}\` (${catalog._meta.totalCases} cases, ${webCases.length} web-scoped).`);
lines.push('');
lines.push('Denominator is the **browser-automatable** web subset — web cases that need a');
lines.push('physical iOS device, a D365 posting batch, or human judgement (performance,');
lines.push('compatibility, accessibility, usability) stay in the manual cycle and are counted');
lines.push('under *Manual* rather than held against automation.');
lines.push('');
lines.push('| Module | Automatable | Covered | Partial | % | P1 automatable | P1 covered | Manual |');
lines.push('|---|---:|---:|---:|---:|---:|---:|---:|');
for (const row of [...modules.values()].sort((a, b) => a.tab.localeCompare(b.tab))) {
  lines.push(
    `| ${row.tab} | ${row.automatable} | ${row.covered} | ${row.partial} | ${pct(row.covered, row.automatable)} ` +
      `| ${row.automatableP1} | ${row.coveredP1} | ${row.excluded} |`,
  );
}
lines.push(
  `| **TOTAL** | **${automatable.length}** | **${coveredTotal}** | **${partialTotal}** ` +
    `| **${pct(coveredTotal, automatable.length)}** ` +
    `| **${automatableP1}** | **${coveredP1}** | **${webCases.length - automatable.length}** |`,
);
lines.push('');
lines.push('## Fully covered cases');
lines.push('');
lines.push("The automated test asserts the whole of the workbook's expected result.");
lines.push('');
lines.push('| TC-ID | Priority | Case | Spec |');
lines.push('|---|---|---|---|');
for (const c of automatable.filter((x) => tagged.has(x.id))) {
  lines.push(`| ${c.id} | ${c.priority} | ${c.title} | \`${tagged.get(c.id)!.join('`, `')}\` |`);
}
lines.push('');
lines.push('## Partially covered cases');
lines.push('');
lines.push('The flow is automated but part of the expected result is still unasserted, so');
lines.push('these stay in the manual cycle. Closing a partial is usually cheaper than');
lines.push('automating a new case - the navigation and setup already exist.');
lines.push('');
lines.push('| TC-ID | Priority | Case | Expected result still unasserted | Spec |');
lines.push('|---|---|---|---|---|');
for (const c of automatable.filter((x) => !tagged.has(x.id) && taggedPartial.has(x.id))) {
  const expected = c.expected.replace(/\s*\n\s*/g, ' ').replace(/\|/g, '\\|');
  lines.push(
    `| ${c.id} | ${c.priority} | ${c.title} | ${expected} | \`${taggedPartial.get(c.id)!.join('`, `')}\` |`,
  );
}
lines.push('');

const report = lines.join('\n');
console.log(report);

if (orphanTags.length) {
  console.error(`\n@TC tags matching no workbook case: ${orphanTags.join(', ')}`);
}
if (doubleTagged.length) {
  console.error(`\nCases tagged both @TC: and @TC-partial:, pick one: ${doubleTagged.join(', ')}`);
}

if (process.argv.includes('--write')) {
  writeFileSync(OUT_MD, report);
  console.log(`\nWrote ${path.relative(ROOT, OUT_MD)}`);
}

// Non-zero on a broken traceability link so CI catches it.
process.exit(orphanTags.length || doubleTagged.length ? 1 : 0);
