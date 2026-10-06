/**
 * Acre-weighted hour distribution — the reference calculator for the Paycom Integration PSD
 * ("Resource and Machine Hour Distribution Logic"). Pure functions, no I/O.
 *
 * Verified against `resources/Vann Brothers test cases/acre_weighted_hours_Distribution.xlsm`
 * (Cases 2–9, 2026-10-05). Plan: `test-plans/authenticated/paycom-labor-variance.md`, section A0.
 *
 * Scope: ONE resource + machine pair. Callers group entries first; entries for a different
 * resource or machine never distribute against each other.
 *
 *   Weighted Hours = Overlap Hours × Plot Acres / Total Active Acres
 *
 * Times are minutes from midnight. A segment is the span between two consecutive start/end
 * breakpoints; the active entries in it share its hours by acres, a lone entry keeps all of it,
 * and a gap with no active entry is not distributed. Total distributed hours therefore equal the
 * union of the working time, never the sum of the raw durations.
 */
export interface HourEntry {
  /** Free-form label, e.g. `WO-1 Plot 1`. Not used by the maths. */
  id: string;
  acres: number;
  /** Minutes from midnight. */
  start: number;
  end: number;
}

export interface DistributedEntry extends HourEntry {
  hours: number;
  /** Distributed time range, laid back to back in start order (`H:MM`). */
  rangeStart: string;
  rangeEnd: string;
}

/** `2:40`, rounded to the nearest minute. */
export function fmtClock(minutes: number): string {
  const m = Math.round(minutes);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}

/** `'2:15'` → 135. */
export function clock(text: string): number {
  const [h, m] = text.split(':').map(Number);
  return h * 60 + m;
}

export function distributeHours(entries: HourEntry[]): DistributedEntry[] {
  for (const e of entries) {
    if (!(e.end > e.start)) throw new Error(`${e.id}: end must be after start`);
    if (!(e.acres > 0)) throw new Error(`${e.id}: acres must be above zero`);
  }
  const points = [...new Set(entries.flatMap((e) => [e.start, e.end]))].sort((a, b) => a - b);
  const hours = entries.map(() => 0);
  for (let i = 0; i + 1 < points.length; i++) {
    const [from, to] = [points[i], points[i + 1]];
    const active = entries.flatMap((e, idx) => (e.start <= from && e.end >= to ? [idx] : []));
    const totalAcres = active.reduce((sum, idx) => sum + entries[idx].acres, 0);
    for (const idx of active) hours[idx] += ((to - from) / 60) * (entries[idx].acres / totalAcres);
  }

  // Re-time back to back in start order, from the earliest start (stable for equal starts).
  let cursor = Math.min(...entries.map((e) => e.start));
  const order = entries.map((_, idx) => idx).sort((a, b) => entries[a].start - entries[b].start || a - b);
  const range = new Map<number, [string, string]>();
  for (const idx of order) {
    range.set(idx, [fmtClock(cursor), fmtClock(cursor + hours[idx] * 60)]);
    cursor += hours[idx] * 60;
  }
  return entries.map((e, idx) => ({ ...e, hours: hours[idx], rangeStart: range.get(idx)![0], rangeEnd: range.get(idx)![1] }));
}

/**
 * Adjustment impact per entry id: `After Update Hours − Before Update Hours`
 * (PSD validation 11). Positive adds hours, negative removes them. An entry missing from `after`
 * counts as 0 hours (deleted / voided).
 */
export function adjustmentImpact(before: HourEntry[], after: HourEntry[]): Record<string, { before: number; after: number; impact: number }> {
  const b = new Map(distributeHours(before).map((e) => [e.id, e.hours]));
  const a = new Map((after.length ? distributeHours(after) : []).map((e) => [e.id, e.hours]));
  const out: Record<string, { before: number; after: number; impact: number }> = {};
  for (const id of new Set([...b.keys(), ...a.keys()])) {
    const [bh, ah] = [b.get(id) ?? 0, a.get(id) ?? 0];
    out[id] = { before: bh, after: ah, impact: ah - bh };
  }
  return out;
}
