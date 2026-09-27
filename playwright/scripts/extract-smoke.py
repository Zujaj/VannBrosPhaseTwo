#!/usr/bin/env python3
"""
Extract the Vann Brothers smoke checklist into a checked-in JSON catalogue.

    python3 scripts/extract-smoke.py        (pnpm smoke:catalog)

Reads the current sheet of `resources/Vann Brother Smoke check list.xlsx` and writes
`test-plans/catalog/smoke-cases.json`.

The checklist, unlike the regression workbook, carries NO case IDs: a row is just
Module / Test Scenario / Test Description, with Module and Scenario written once and left
blank on the rows below. So this script mints the IDs (`WO-01`, `MP-03`, ...) and keeps them
STABLE across re-extractions: a row whose (area, scenario, description, occurrence) matches a
row already in the catalogue keeps its ID, and only a genuinely new row gets the next free
number in its area. Deleted rows simply disappear. Never renumber by hand - specs tag these
IDs (`@SMK:WO-01`), and `pnpm smoke:coverage` fails on a tag that matches no row.

Each row is also given a `scope`, since the checklist mixes web, mobile and D365 checks:

    web           a browser can assert it - the automation target
    mobile        mobile-app / offline execution; out of scope for the web suite
    after-mobile  a web check of data that only mobile execution produces (progress, adjustments)
    d365          verified in Dynamics 365 after the posting batch (material / machine posting)

The Status / Bug / Assignee columns are the QA team's per-cycle record and are NOT extracted.
"""
import json
import re
import sys
from pathlib import Path

from xlsx_reader import read_workbook

REPO_ROOT = Path(__file__).resolve().parents[2]
WORKBOOK = REPO_ROOT / 'resources' / 'Vann Brother Smoke check list.xlsx'
OUT = Path(__file__).resolve().parents[1] / 'test-plans' / 'catalog' / 'smoke-cases.json'

# The workbook keeps older cycles as extra sheets ("Previous Detail Smoke Checklist"); the
# current one is the first sheet whose name does not start with "Previous".
def current_sheet(sheets):
    for name, rows in sheets:
        if not name.lower().startswith('previous'):
            return name, rows
    sys.exit('No current checklist sheet found')


def area_of(module, scenario):
    """Two-letter ID prefix for a row, from its module and scenario."""
    m, s = module.lower(), scenario.lower()
    if m.startswith('work order'):
        return 'WI' if 'inspection' in s else 'WO'
    if m.startswith('template'):
        if 'attribute' in s:
            return 'TA'
        if 'inspection' in s:
            return 'TI'
        return 'TM'
    if m.startswith('poi'):
        return 'IM' if 'inspection wo' in s else 'PO'
    table = {'maps': 'MP', 'user settings': 'US', 'settings': 'ST', 'offline': 'OF', 'tank mixing': 'TK'}
    for prefix, code in table.items():
        if m.startswith(prefix):
            return code
    sys.exit(f'No area code for module {module!r} / scenario {scenario!r} - add one to area_of()')


# Work-order rows interleave web authoring with mobile execution in a single scenario.
WO_WEB = re.compile(r'from web|save as draft|verify wo detail screen|clones', re.I)
WO_AFTER_MOBILE = re.compile(r'progress update on web|updated on web|adjus?ment from web', re.I)
POSTING = re.compile(r'posting', re.I)


def scope_of(area, scenario, description):
    if area in ('OF', 'IM') or 'mobile' in scenario.lower():
        return 'mobile'
    if area in ('WO', 'WI'):
        if POSTING.search(description):
            return 'd365'
        if WO_AFTER_MOBILE.search(description):
            return 'after-mobile'
        if 'from mobile' in description.lower():
            return 'mobile'
        return 'web' if WO_WEB.search(description) else 'mobile'
    if 'from mobile' in description.lower():
        return 'mobile'
    return 'web'


def clean(text):
    return re.sub(r'\s+', ' ', text or '').strip()


def main():
    if not WORKBOOK.exists():
        sys.exit(f'Workbook not found: {WORKBOOK}')

    sheet, rows = current_sheet(list(read_workbook(WORKBOOK)))

    previous = {}
    if OUT.exists():
        for case in json.loads(OUT.read_text())['cases']:
            previous[case['key']] = case['id']

    cases, seen = [], {}
    module = scenario = ''
    for cells in rows:
        if cells.get('A') == 'Module':
            continue
        if cells.get('A'):
            module, scenario = clean(cells['A']), ''
        if cells.get('B'):
            scenario = clean(cells['B'])
        description = clean(cells.get('C'))
        if not description:
            continue
        area = area_of(module, scenario)
        base = f'{area}|{scenario}|{description}'
        seen[base] = seen.get(base, 0) + 1
        cases.append({
            'key': f'{base}|{seen[base]}',
            'area': area,
            'module': module,
            'scenario': scenario,
            'description': description,
            'scope': scope_of(area, scenario, description),
        })

    # Stable IDs: reuse, then fill the gaps per area with the next free number.
    used = {}
    for case in cases:
        if case['key'] in previous:
            case['id'] = previous[case['key']]
            used.setdefault(case['area'], set()).add(int(case['id'].split('-')[1]))
    for case in cases:
        if 'id' not in case:
            taken = used.setdefault(case['area'], set())
            n = max(taken, default=0) + 1
            taken.add(n)
            case['id'] = f"{case['area']}-{n:02d}"

    # A module row with no descriptions under it at all (e.g. "Planning Tab" in v2) is a
    # placeholder the QA team has not filled in; report it so the gap stays visible.
    modules_with_rows = {c['module'] for c in cases}
    skipped = [m for m in dict.fromkeys(clean(r['A']) for r in rows if r.get('A') and r['A'] != 'Module')
               if m not in modules_with_rows]

    ordered = [{'id': c['id'], **{k: v for k, v in c.items() if k != 'id'}} for c in cases]
    scopes = {}
    for c in ordered:
        scopes[c['scope']] = scopes.get(c['scope'], 0) + 1

    payload = {
        '_meta': {
            'source': str(WORKBOOK.relative_to(REPO_ROOT)),
            'sheet': sheet,
            'generatedBy': 'playwright/scripts/extract-smoke.py',
            'totalRows': len(ordered),
            'byScope': scopes,
            'headerOnlyModules': skipped,
            'note': 'IDs are minted here and must stay stable. Regenerate with `pnpm smoke:catalog`.',
        },
        'cases': ordered,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + '\n')
    print(f'Wrote {OUT.relative_to(REPO_ROOT)}: {len(ordered)} rows from "{sheet}" {scopes}'
          + (f'; header-only modules skipped: {skipped}' if skipped else ''))


if __name__ == '__main__':
    main()
