# Test Plan — Work Order Weather Logging (Web)

> Cross-cutting Work Order sub-feature: a **Weather** section rendered above the Map on the WO
> details page, populated from Start/End job events executed on mobile. Siblings:
> [`work-orders-planned.md`](./work-orders-planned.md),
> [`work-orders-inspection.md`](./work-orders-inspection.md),
> [`work-orders-harvest.md`](./work-orders-harvest.md) (its TC-14 asserts these rules hold
> for harvest WOs).

- **Spec:** `playwright/tests/authenticated/work-order-weather.spec.ts`
- **Automation status:** Partial — automated & passing:
  - **WO-WX-001** — opens a live "To Do" WO's read-only details page and confirms the Weather
    grid shows only its "No Record Found" placeholder row, above the Plots Map section.
    Non-mutating.
  - **Manual (not automated):** WO-WX-002/003/004/005/006/007/008/009 — all require a WO with
    mobile-recorded weather data already populated, not reliably available/creatable from a
    web-only Playwright suite (see Automation notes below).
- **Source of truth:** `resources/Vann Brothers test cases/Vann Brothers test cases/Weather TestCases.xlsx`
  (sheet `Wind-24287`, `FOR WEB` section, TC_WEB_01–09). **Gap:** `vannbrosphasetwo-knowledge` has no
  `weather.md` reference — this feature isn't documented in the knowledge base yet; wording
  below is sourced from the spreadsheet and must be re-verified against the live QA app.
- **Last updated:** 2026-08-26

**Scope:** Web-side verification of the Weather section on the Work Order details page —
tabular display, PDF export, sorting, and edge cases (missing coordinates). **Mobile-side
weather logging (job start/pause/end capture, offline behavior) is out of scope** — see the
excluded `TC_MOB_01–09` cases in the source spreadsheet. Weather *population* (Start/End job
events) happens on mobile; these cases only verify the *web* read surface, so most require a
precondition WO that already has mobile-recorded weather data.

**Historical execution note:** the source spreadsheet carries prior manual execution results
(`Status` column) from before this repo tracked the feature. Those are preserved per case below
as **Prior result** — they are NOT a substitute for live re-verification; the app may have
changed since.

---

## WO-WX-001 — Weather section renders empty before job start

| Field | Content |
|---|---|
| **ID** | WO-WX-001 |
| **Title** | Weather section is present but empty on a WO whose job hasn't started |
| **Module** | Work Orders — Weather Logging |
| **Role** | Manager/Supervisor |
| **Platform** | Web |
| **Priority** | P2 |
| **Preconditions** | A WO exists in `Draft`/`To Do`/`Queue` (job not yet started on mobile) |
| **Steps** | 1. Open the Work Order details page on the Web. 2. Locate the **Weather** section (rendered above the **Map**). |
| **Expected result** | The Weather section is present but shows no data rows (no job has been started yet). |
| **Type** | Functional |
| **Prior result** | Pass (`TC_WEB_01`) |
| **Automation** | Automated (`work-order-weather.spec.ts`). Non-mutating — opens the first live "To Do" row via **View Work Order Detail**. Live findings (2026-08-26): the map section is titled **"Plots Map"**, not generic "Map"; the Weather grid's empty state renders a single **"No Record Found"** row (not an absent section). Live Weather columns are **Plot / Datetime / Temprature [sic] / Wind Speed / Wind Direction / Humidity / Conditions / Cloud Cover** — richer than the 4 columns (Timestamp/Temp/Wind Speed/Wind Direction) the source spreadsheet describes for WO-WX-002; re-verify that case's expected result against the live column set before automating it. |

---

## WO-WX-002 — Weather data renders in tabular format

| Field | Content |
|---|---|
| **ID** | WO-WX-002 |
| **Title** | Weather data displays in a tabular format on the Web UI |
| **Module** | Work Orders — Weather Logging |
| **Role** | Manager/Supervisor |
| **Platform** | Web |
| **Priority** | P1 |
| **Preconditions** | An existing WO whose job has been started/ended on mobile for ≥1 plot (weather already logged) |
| **Steps** | 1. Open an existing Work Order on the Web App. 2. Locate the **Weather** section (above the Map). |
| **Expected result** | Data renders as a table with columns **Timestamp**, **Temp**, **Wind Speed**, **Wind Direction**, for both the Start and End event of each plot. |
| **Type** | Functional |
| **Prior result** | Pass (`TC_WEB_02`) |

---

## WO-WX-003 — Weather table included in PDF export

| Field | Content |
|---|---|
| **ID** | WO-WX-003 |
| **Title** | Downloaded Work Order PDF contains the weather details table |
| **Module** | Work Orders — Weather Logging |
| **Role** | Manager/Supervisor |
| **Platform** | Web |
| **Priority** | P2 |
| **Preconditions** | Same as WO-WX-002 |
| **Steps** | 1. Open the Work Order. 2. Download the Work Order (PDF export). |
| **Expected result** | The exported PDF contains the weather details table. |
| **Type** | Functional |
| **Prior result** | Pass (`TC_WEB_03`) |

---

## WO-WX-004 — Inspection WO weather-logging parity

| Field | Content |
|---|---|
| **ID** | WO-WX-004 |
| **Title** | Weather logging behaves the same on Inspection WOs as on standard WOs |
| **Module** | Work Orders — Weather Logging |
| **Role** | Manager/Supervisor |
| **Platform** | Web (job start/pause executed on mobile per precondition) |
| **Priority** | P2 |
| **Preconditions** | An Inspection WO exists; job started and paused on plots via mobile |
| **Steps** | 1. Open an Inspection Work Order on Web. 2. Confirm the Weather section is captured/displayed identically to a Planned/Tank-Mix WO. |
| **Expected result** | Weather logging is captured and displayed for Inspection-type WOs exactly like standard Work Orders. |
| **Type** | Functional / Regression |
| **Prior result** | Pass (`TC_WEB_04`) |

---

## WO-WX-005 — Weather grid follows manual Spent Hours/End Time edits (KNOWN FAIL)

| Field | Content |
|---|---|
| **ID** | WO-WX-005 |
| **Title** | Weather grid and plot End Time update when Spent Hours are adjusted manually on Web |
| **Module** | Work Orders — Weather Logging |
| **Role** | Manager/Supervisor |
| **Platform** | Web |
| **Priority** | P1 |
| **Preconditions** | An existing WO with a completed job on ≥1 plot |
| **Steps** | 1. Open the Work Order and note the current weather log timestamp for a completed plot's Job Details. 2. Manually edit that plot's **Spent Hours**/**End Time** on the Web interface. 3. Save. |
| **Expected result** | The End Date/Time in the plot grid **and** the corresponding weather log entry both update to reflect the newly adjusted time. |
| **Type** | Functional / Regression |
| **Prior result** | **Fail** (`TC_WEB_06` in source) — no Bug ID recorded in the spreadsheet. Re-verify live and file a defect if still reproducible before automating a regression check. |

---

## WO-WX-006 — Manual time adjustments reflected in PDF export (KNOWN FAIL)

| Field | Content |
|---|---|
| **ID** | WO-WX-006 |
| **Title** | PDF export reflects a manually adjusted weather timestamp |
| **Module** | Work Orders — Weather Logging |
| **Role** | Manager/Supervisor |
| **Platform** | Web |
| **Priority** | P2 |
| **Preconditions** | Same as WO-WX-005; perform the WO-WX-005 edit first |
| **Steps** | 1. Modify a plot's Spent Hours on Web (as in WO-WX-005). 2. Confirm the updated weather log reflects the change. 3. Download the Work Order PDF. |
| **Expected result** | The downloaded PDF displays the updated weather grid with the manually adjusted timestamps. |
| **Type** | Functional / Regression |
| **Prior result** | **Fail** (`TC_WEB_06`) — likely downstream of the WO-WX-005 defect (PDF export just inherits the un-updated grid); no Bug ID recorded. |

---

## WO-WX-007 — Weather records sorted by Field Code then Date/Time

| Field | Content |
|---|---|
| **ID** | WO-WX-007 |
| **Title** | Weather grid sorts alphanumerically by Field Code, then chronologically |
| **Module** | Work Orders — Weather Logging |
| **Role** | Manager/Supervisor |
| **Platform** | Web |
| **Priority** | P3 |
| **Preconditions** | A WO with multiple plots (alphanumeric + alphabetic Field Codes) and weather logs across different dates/times |
| **Steps** | 1. Open the Work Order. 2. Inspect the Weather grid row order on the Web UI. |
| **Expected result** | Records are sorted primarily by Field Code (alphanumeric order), secondarily by Date/Time (chronological). |
| **Type** | Functional |
| **Prior result** | Pass (`TC_WEB_07`; originally also checked Mobile — mobile portion out of scope here) |

---

## WO-WX-008 — Sort order preserved in PDF export

| Field | Content |
|---|---|
| **ID** | WO-WX-008 |
| **Title** | Weather record sort order matches between Web UI and PDF export |
| **Module** | Work Orders — Weather Logging |
| **Role** | Manager/Supervisor |
| **Platform** | Web |
| **Priority** | P3 |
| **Preconditions** | Same as WO-WX-007 |
| **Steps** | 1. Generate a Work Order PDF. 2. Inspect the order of weather records in the PDF. |
| **Expected result** | The sort order from WO-WX-007 is preserved consistently in the generated PDF. |
| **Type** | Functional |
| **Prior result** | **Not executed** (`TC_WEB_08` — Status left blank in source). Needs a first execution pass, live or automated, before it can be trusted as covered. |

---

## WO-WX-009 — Weather grid excludes plots with missing map coordinates

| Field | Content |
|---|---|
| **ID** | WO-WX-009 |
| **Title** | Plots without map coordinates are excluded from the weather grid |
| **Module** | Work Orders — Weather Logging |
| **Role** | Manager/Supervisor |
| **Platform** | Web |
| **Priority** | P2 |
| **Preconditions** | A WO with ≥1 plot that has no coordinates on the map; job started and ended for that plot |
| **Steps** | 1. Open the Work Order. 2. Compare the **Weather** section against the **Plot Details**/Map section for the coordinate-less plot. |
| **Expected result** | (1) The Plots Map section shows a warning `No coordinates found to load map [Plot ID]` just below the weather table. (2) The Weather grid shows **no** record for the plot lacking coordinates (no location to fetch weather against). |
| **Type** | Negative / Edge |
| **Prior result** | Pass (`TC_WEB_09`) |

---

## Automation notes

- All nine cases need an **existing, previously-executed WO** as precondition data (weather is
  only populated by mobile Start/End job events) — none can be driven purely from a fresh
  `Create New Work Orders` form the way `work-orders-planned.md` TC-1 can. Automating requires
  either: (a) locating a stable, already-executed WO in the shared QA env to open read-only
  (non-mutating), or (b) chaining a web-create + a scripted/mocked mobile execution step, which
  is out of scope for a web-only Playwright suite.
- **WO-WX-001** is the one case that only needs a *fresh, unstarted* WO — the least
  precondition-coupled and the best automation candidate first.
- **WO-WX-005/006** are known-failing; before writing an automated regression assertion, first
  re-verify live and get these attached to a real Bug ID (the source spreadsheet records the
  failure but no ticket number).
