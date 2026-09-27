#!/usr/bin/env python3
"""
Extract the Vann Brothers regression workbook into a checked-in JSON catalogue.

    python3 scripts/extract-cases.py

Reads `resources/Vann Brothers test cases/.../AgriFarm_VannBrothers_Regression_Suite_Web_iOS.xlsx`
and writes `test-plans/catalog/web-cases.json`.

Why a catalogue rather than reading the .xlsx directly from the coverage script: the
workbook is the QA team's working document (they update the Status column each cycle and it
is opened in Excel), whereas automation needs a stable, diffable, dependency-free artefact.
Committing the extraction means `pnpm coverage` runs with no xlsx parser in the Node
dependency tree, and a change to the suite's SCOPE shows up as a reviewable diff instead of
silently moving the coverage denominator.

Uses only the standard library — an .xlsx is a zip of XML, and the repo has no pip.
Re-run this whenever the workbook's case list changes (not for Status-column updates,
which the catalogue deliberately does not carry).
"""
import json
import sys
from pathlib import Path

from xlsx_reader import read_workbook

REPO_ROOT = Path(__file__).resolve().parents[2]
WORKBOOK = (
    REPO_ROOT
    / 'resources'
    / 'Vann Brothers test cases'
    / 'Vann Brothers test cases'
    / 'AgriFarm_VannBrothers_Regression_Suite_Web_iOS.xlsx'
)
OUT = Path(__file__).resolve().parents[1] / 'test-plans' / 'catalog' / 'web-cases.json'

# Column letters, from the header row each module tab repeats.
COLUMNS = {
    'A': 'id', 'B': 'module', 'C': 'subProcess', 'D': 'platform', 'E': 'prerequisite',
    'F': 'title', 'G': 'steps', 'H': 'expected', 'I': 'priority', 'J': 'type',
    'K': 'estimateMinutes',
}
# Status / Actual Result / Comments (L, M, N) are the QA team's per-cycle execution record.
# They are intentionally NOT extracted: the catalogue describes the suite, not a run of it.


def main():
    if not WORKBOOK.exists():
        sys.exit(f'Workbook not found: {WORKBOOK}')

    cases = []
    for name, rows in read_workbook(WORKBOOK):
        # Module tabs are the numbered ones ("01 Global & Navigation"); Cover, Health
        # Summary, Defect Log and Test Data & Env carry no cases.
        if not name[:1].isdigit():
            continue
        seen_header = False
        for cells in rows:
            if cells.get('A') == 'TC-ID':
                seen_header = True
                continue
            if not seen_header or not cells.get('A'):
                continue
            case = {'tab': name}
            for letter, key in COLUMNS.items():
                case[key] = cells.get(letter, '')
            cases.append(case)

    payload = {
        '_meta': {
            'source': str(WORKBOOK.relative_to(REPO_ROOT)),
            'generatedBy': 'playwright/scripts/extract-cases.py',
            'totalCases': len(cases),
            'webCases': sum(1 for c in cases if 'Web' in c['platform']),
            'note': 'Regenerate with `pnpm catalog`. Execution status is not carried here.',
        },
        'cases': cases,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + '\n')
    print(f'Wrote {OUT.relative_to(REPO_ROOT)}: {len(cases)} cases '
          f'({payload["_meta"]["webCases"]} web-scoped)')


if __name__ == '__main__':
    main()
