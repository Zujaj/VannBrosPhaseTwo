import { test, expect } from '@playwright/test';
import { adjustmentImpact, clock, distributeHours, type HourEntry } from '../helpers/hourDistribution';

/**
 * Paycom Integration — acre-weighted hour distribution, reference oracle (no browser, no QA data).
 * Locks the expected values from `resources/Vann Brothers test cases/acre_weighted_hours_Distribution.xlsm`
 * (Cases 1–10) against `tests/helpers/hourDistribution.ts`, so the QA spec written once the feature
 * ships can feed the same `CASES` through the app and diff the result.
 * Plan: `test-plans/authenticated/paycom-labor-variance.md` (A0; A-DIST, A-INV, A-ADJ).
 *
 * Needs no page, so run it alone with `pnpm test:fast --no-deps hour-distribution-oracle`
 * (the project's auth setup is then skipped).
 */
const e = (id: string, acres: number, start: string, end: string): HourEntry => ({ id, acres, start: clock(start), end: clock(end) });

interface Expected { id: string; hours: number; range: [string, string] }

/** Distribution cases 1–5 — the sheet's "Final Output After Acre Weighted Distribution". */
const CASES: { name: string; tc: string; entries: HourEntry[]; expected: Expected[] }[] = [
  {
    name: 'Case 1 — single WO, single plot: no split',
    tc: 'A-DIST-001',
    entries: [e('WO-1 Plot 1', 100, '2:00', '4:00')],
    expected: [{ id: 'WO-1 Plot 1', hours: 2, range: ['2:00', '4:00'] }],
  },
  {
    name: 'Case 2 — same WO, same time, two plots 100:50',
    tc: 'A-DIST-002',
    entries: [e('WO-1 Plot 1', 100, '2:00', '4:00'), e('WO-1 Plot 2', 50, '2:00', '4:00')],
    expected: [
      { id: 'WO-1 Plot 1', hours: 4 / 3, range: ['2:00', '3:20'] },
      { id: 'WO-1 Plot 2', hours: 2 / 3, range: ['3:20', '4:00'] },
    ],
  },
  {
    name: 'Case 3 — partial overlap: only 3:00–4:00 is split',
    tc: 'A-DIST-004',
    entries: [e('WO-1 Plot 1', 100, '2:00', '4:00'), e('WO-1 Plot 2', 50, '3:00', '4:00')],
    expected: [
      { id: 'WO-1 Plot 1', hours: 5 / 3, range: ['2:00', '3:40'] },
      { id: 'WO-1 Plot 2', hours: 1 / 3, range: ['3:40', '4:00'] },
    ],
  },
  {
    name: 'Case 4 — same resource and machine across two work orders',
    tc: 'A-DIST-006',
    entries: [e('WO-1 Plot 2', 50, '2:00', '5:00'), e('WO-2 Plot 1', 100, '1:00', '3:00')],
    expected: [
      { id: 'WO-1 Plot 2', hours: 7 / 3, range: ['2:40', '5:00'] },
      { id: 'WO-2 Plot 1', hours: 5 / 3, range: ['1:00', '2:40'] },
    ],
  },
  {
    name: 'Case 5 — complex overlap across two WOs, every segment split',
    tc: 'A-DIST-005',
    entries: [
      e('WO-1 Plot 1', 100, '2:00', '4:00'),
      e('WO-1 Plot 2', 50, '2:30', '3:30'),
      e('WO-2 Plot 1', 100, '2:15', '3:45'),
      e('WO-2 Plot 3', 40, '1:00', '6:00'),
    ],
    expected: [
      { id: 'WO-1 Plot 1', hours: 0.9103, range: ['4:22', '5:16'] },
      { id: 'WO-1 Plot 2', hours: 0.1724, range: ['5:50', '6:00'] },
      { id: 'WO-2 Plot 1', hours: 0.5532, range: ['5:16', '5:50'] },
      { id: 'WO-2 Plot 3', hours: 3.3641, range: ['1:00', '4:22'] },
    ],
  },
];

test.describe('@PAYCOM Acre-weighted distribution — oracle cases', () => {
  for (const c of CASES) {
    test(`${c.tc} ${c.name}`, () => {
      const out = distributeHours(c.entries);
      for (const want of c.expected) {
        const got = out.find((o) => o.id === want.id)!;
        expect(got.hours, `${want.id} hours`).toBeCloseTo(want.hours, 3);
        expect([got.rangeStart, got.rangeEnd], `${want.id} range`).toEqual(want.range);
      }
    });
  }
});

test.describe('@PAYCOM Acre-weighted distribution — adjustments', () => {
  const impactOf = (r: ReturnType<typeof adjustmentImpact>, id: string) => r[id].impact;

  test('A-ADJ-001 Case 6 — WO-1 Plot 1 extended 2:00–4:00 → 2:00–5:00, WO-2 is rechecked', () => {
    const before = [e('WO-1 Plot 1', 100, '2:00', '4:00'), e('WO-2 Plot 2', 50, '3:00', '6:00')];
    const after = [e('WO-1 Plot 1', 100, '2:00', '5:00'), e('WO-2 Plot 2', 50, '3:00', '6:00')];
    const r = adjustmentImpact(before, after);
    expect(r['WO-1 Plot 1'].before).toBeCloseTo(5 / 3, 3);
    expect(r['WO-1 Plot 1'].after).toBeCloseTo(7 / 3, 3);
    expect(impactOf(r, 'WO-1 Plot 1')).toBeCloseTo(2 / 3, 3);
    expect(impactOf(r, 'WO-2 Plot 2')).toBeCloseTo(-2 / 3, 3);
  });

  test('A-ADJ-006 Case 7 — same plot in two WOs, WO-1 2:00–4:00 → 2:00–4:30', () => {
    const before = [e('WO-1 Plot 1', 100, '2:00', '4:00'), e('WO-2 Plot 1', 100, '3:00', '5:00')];
    const after = [e('WO-1 Plot 1', 100, '2:00', '4:30'), e('WO-2 Plot 1', 100, '3:00', '5:00')];
    const r = adjustmentImpact(before, after);
    expect([r['WO-1 Plot 1'].before, r['WO-2 Plot 1'].before]).toEqual([1.5, 1.5]);
    expect([r['WO-1 Plot 1'].after, r['WO-2 Plot 1'].after]).toEqual([1.75, 1.25]);
    expect(impactOf(r, 'WO-1 Plot 1')).toBeCloseTo(0.25, 6);
    expect(impactOf(r, 'WO-2 Plot 1')).toBeCloseTo(-0.25, 6);
  });

  test('A-ADJ-003 Case 8 — every overlapping plot is recalculated; WO-2 Plot 3 loses what Plot 1 gains', () => {
    const base = [
      e('WO-1 Plot 2', 50, '2:30', '3:30'),
      e('WO-2 Plot 1', 100, '2:15', '3:45'),
      e('WO-2 Plot 3', 40, '1:00', '6:00'),
    ];
    const r = adjustmentImpact(
      [e('WO-1 Plot 1', 100, '2:00', '4:00'), ...base],
      [e('WO-1 Plot 1', 100, '2:00', '5:00'), ...base],
    );
    expect(r['WO-1 Plot 1'].before).toBeCloseTo(0.9103, 3);
    expect(r['WO-1 Plot 1'].after).toBeCloseTo(1.6246, 3);
    expect(impactOf(r, 'WO-1 Plot 1')).toBeCloseTo(0.7143, 3);
    expect(impactOf(r, 'WO-1 Plot 2')).toBeCloseTo(0, 6);
    expect(impactOf(r, 'WO-2 Plot 1')).toBeCloseTo(0, 6);
    expect(r['WO-2 Plot 3'].after).toBeCloseTo(2.6498, 3);
    expect(impactOf(r, 'WO-2 Plot 3')).toBeCloseTo(-0.7143, 3);
    // Workbook defect W1: its Delta column shows the sign reversed; the true resource impact is above.
    const total = Object.values(r).reduce((s, x) => s + x.impact, 0);
    expect(total).toBeCloseTo(0, 6);
  });

  test('A-ADJ-009 Case 9 — a voided distributed entry is excluded; the other keeps its hours', () => {
    const before = [e('WO-1 Plot 1', 50, '2:00', '4:00'), e('WO-2 Plot 2', 100, '3:00', '4:00')];
    const distributed = distributeHours(before);
    expect(distributed.map((d) => [d.rangeStart, d.rangeEnd])).toEqual([['2:00', '3:20'], ['3:20', '4:00']]);
    // The 3:20–4:00 entry is voided: only the re-timed WO-1 entry (2:00–3:20) remains.
    const r = adjustmentImpact(before, [e('WO-1 Plot 1', 50, '2:00', '3:20')]);
    expect(r['WO-1 Plot 1'].after).toBeCloseTo(4 / 3, 4);
    expect(impactOf(r, 'WO-1 Plot 1')).toBeCloseTo(0, 4);
    expect(r['WO-2 Plot 2'].after).toBe(0);
    expect(impactOf(r, 'WO-2 Plot 2')).toBeCloseTo(-2 / 3, 4);
  });

  test('A-ADJ-010 Case 10 — overlap removed by an edit; the 3:00–3:20 gap is not distributed', () => {
    const before = [e('WO-1 Plot 1', 50, '2:00', '4:00'), e('WO-2 Plot 2', 100, '3:00', '4:00')];
    const after = [e('WO-1 Plot 1', 50, '2:00', '3:00'), e('WO-2 Plot 2', 100, '3:20', '4:00')];
    const r = adjustmentImpact(before, after);
    expect(r['WO-1 Plot 1'].after).toBe(1);
    expect(impactOf(r, 'WO-1 Plot 1')).toBeCloseTo(-1 / 3, 4);
    expect(r['WO-2 Plot 2'].after).toBeCloseTo(2 / 3, 4);
    expect(impactOf(r, 'WO-2 Plot 2')).toBeCloseTo(0, 4);
  });

  test('A-ADJ-007 edit then revert nets to zero impact', () => {
    const original = [e('WO-1 Plot 1', 100, '2:00', '4:00'), e('WO-2 Plot 2', 50, '3:00', '6:00')];
    const r = adjustmentImpact(original, original.map((x) => ({ ...x })));
    for (const v of Object.values(r)) expect(v.impact).toBe(0);
  });
});

test.describe('@PAYCOM Acre-weighted distribution — invariants and edges', () => {
  test('A-INV-001/003 total distributed hours equal the union of working time, never the raw sum', () => {
    for (const c of CASES) {
      const out = distributeHours(c.entries);
      const union = Math.max(...c.entries.map((x) => x.end)) - Math.min(...c.entries.map((x) => x.start));
      const total = out.reduce((s, x) => s + x.hours, 0);
      expect(total, c.name).toBeCloseTo(union / 60, 9);
      expect(total, c.name).toBeLessThanOrEqual(c.entries.reduce((s, x) => s + (x.end - x.start) / 60, 0) + 1e-9);
    }
  });

  test('A-DIST-005 three plots in one segment: shares follow acres and sum to the segment', () => {
    const out = distributeHours([e('A', 10, '8:00', '9:00'), e('B', 20, '8:00', '9:00'), e('C', 30, '8:00', '9:00')]);
    expect(out.map((o) => o.hours)).toEqual([expect.closeTo(1 / 6, 9), expect.closeTo(2 / 6, 9), expect.closeTo(3 / 6, 9)]);
    expect(out.reduce((s, o) => s + o.hours, 0)).toBeCloseTo(1, 9);
  });

  test('A-DIST-009 back to back: no overlap, no split, each keeps its full duration', () => {
    const out = distributeHours([e('A', 10, '8:00', '12:00'), e('B', 30, '12:00', '14:00')]);
    expect(out.map((o) => o.hours)).toEqual([4, 2]);
  });

  test('a gap between entries is not distributed', () => {
    const out = distributeHours([e('A', 10, '8:00', '9:00'), e('B', 10, '10:00', '11:00')]);
    expect(out.map((o) => o.hours)).toEqual([1, 1]);
    expect(out.map((o) => [o.rangeStart, o.rangeEnd])).toEqual([['8:00', '9:00'], ['9:00', '10:00']]);
  });

  test('A-INV-002 odd three-way split of one hour does not drift', () => {
    const out = distributeHours([e('A', 1, '8:00', '9:00'), e('B', 1, '8:00', '9:00'), e('C', 1, '8:00', '9:00')]);
    expect(out.reduce((s, o) => s + o.hours, 0)).toBeCloseTo(1, 12);
  });

  test('A-VAL-001/002 end at or before start is rejected', () => {
    expect(() => distributeHours([e('A', 10, '9:00', '8:00')])).toThrow(/end must be after start/);
    expect(() => distributeHours([e('A', 10, '9:00', '9:00')])).toThrow(/end must be after start/);
  });

  test('A-DIST-010 a zero-acre plot is rejected rather than dividing by zero', () => {
    expect(() => distributeHours([e('A', 0, '8:00', '9:00')])).toThrow(/acres must be above zero/);
  });
});
