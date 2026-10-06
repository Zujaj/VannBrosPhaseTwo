# Test Plan — Paycom Integration: Productive Hours Distribution + Labor Variance Posting

- **Spec:** `playwright/tests/authenticated/hour-distribution-oracle.spec.ts` (browserless reference
  oracle, 18 tests, green 2026-10-05; run `pnpm test:fast --no-deps hour-distribution-oracle`) with
  the calculator in `playwright/tests/helpers/hourDistribution.ts`. The QA-facing Part A spec is
  _not written yet_ (feature output not exposed; see Automation notes). Part B and Part C are D365 manual.
- **Automation status:** Partially automated (oracle only; nothing runs against the app yet)
- **Product spec:** `resources/product-specifications-document/Phase 2 Paycom Integration.pdf` (PSD v1.0, Jun 9 2026)
- **Functional design:** `resources/functional-design-documents/FDD-VB-AgriERP-Variance Calculation.pdf` (FDD v1.1, Jun 11 2026)
- **Source of truth:** `vannbrosphasetwo-knowledge/references/work-orders.md`, `hour-log-adjustment.md`
- **Last updated:** 2026-10-05
- **Source caveat:** PSD pages 7–11 (user journey workflow and mocks) are images and were **not**
  reviewed. Check this plan against them before filing any defect (see memory: journeys and mocks
  beat summary wording).

**Scope.** Part A: acre-weighted distribution of resource and machine hours (Farm App → D365 project
expense journal). Part B: month-end D365 batch **AgriERP Labor Variance Posting** (GL Labor
Absorption vs project expense, per Plot/Field). Part C: the chain across both. Paycom itself is out
of scope; its payroll cost arrives in the D365 GL.

**Rules for runs.** WOs only move forward: end runs in **Review**, never revert or delete started or
approved WOs. Approving to **Done** posts to the shared D365 company, so do it only on agreed test
projects. Tag future specs `@PAYCOM`.

**Open questions (block the cases that name them).**

| Ref | Question |
|---|---|
| Q1 | PSD p16 says the existing overlapping entry is *distributed*; p19 UC7 and p20 validations 3–4 say it is *voided*. The oracle workbook (Case 9) leans to "voided and replaced by distributed entries" — see A0. Confirm. Blocks A-OV-003/004. |
| Q8, Q9 | New from the oracle: do resource and machine hours diverge after an adjustment, and is the same plot's acreage counted twice across two WOs? See A0. |
| Q2 | Does the overlap prompt apply across work orders, or only within the same WO (p16 wording)? Blocks A-OV-005. |
| Q3 | Rounding rule for odd splits (e.g. 3 plots over 1h) and zero/missing-acre plots. Blocks A-DIST-010, A-INV-002. |
| Q4 | Approval order: PSD p15 says approve "after work orders are posted to D365"; p14 says posting follows approval. |
| Q5 | Button label: PSD p18 "Mark As Done" vs live **Work Order Completed → Approve**. |
| Q6 | FDD: how a multi-plot WO's distributed cost maps to projects (project ↔ Plot/Field), and what "same period" means for duplicate prevention. Blocks B-ERR-004/005. |
| Q7 | FDD: are account 51011, cost center 3510 and Operation ID 1720 configurable or hardcoded? |

---

## Part A — Resource and machine hour distribution (Farm App)

Platform **Web** (manager) with seeded entries via API; entries are **created on mobile** in the
real flow. Role **Manager** unless stated. Preconditions: In Progress WO(s) on the same Site/Season,
a Human resource + Machine with known assets, plots with known acres (e.g. 10 ac and 30 ac).

### A0. Reference oracle — `acre_weighted_hours_Distribution.xlsm`

Source: `resources/Vann Brothers test cases/acre_weighted_hours_Distribution.xlsm` (one sheet,
**Hour distribution**, 10 worked cases, no macros despite the extension). Treat it as the
**expected-result oracle** for Part A. Independently re-computed 2026-10-05 with a segment
algorithm; **every number in Cases 2–9 and every time range matched** (to 4 dp / the minute).

**Algorithm (confirmed).** For one resource + machine, take every entry's start and end as
breakpoints. In each segment between breakpoints, the active entries share the segment hours by
acres: `segment hours × plot acres / total active acres`; a segment with one active entry goes
wholly to it; a gap with no active entry gets nothing. An entry's hours are the sum over its
segments. **Invariant: total distributed hours = the union of working time**, not the sum of raw
durations. After distribution the entries are shown **re-timed back to back in start order**
("Start-ordered Distributed Time Range"), starting at the earliest start.

| Case | Setup (resource + machine the same) | Expected (resource hrs; time range) | Maps to |
|---|---|---|---|
| 1 | WO-1 Plot 1 (100 ac) 2:00–4:00 | 2.0000; 2:00–4:00. "No split" | A-DIST-001 |
| 2 | WO-1 Plot 1 (100) + Plot 2 (50), both 2:00–4:00 | 1.3333 (2:00–3:20) / 0.6667 (3:20–4:00) | A-DIST-002 |
| 3 | Plot 1 (100) 2:00–4:00; Plot 2 (50) 3:00–4:00 | 1.6667 (2:00–3:40) / 0.3333 (3:40–4:00) | A-DIST-004 |
| 4 | WO-1 Plot 2 (50) 2:00–5:00; WO-2 Plot 1 (100) 1:00–3:00 | 2.3333 (2:40–5:00) / 1.6667 (1:00–2:40) | A-DIST-006 |
| 5 | WO-1 P1 (100) 2:00–4:00; WO-1 P2 (50) 2:30–3:30; WO-2 P1 (100) 2:15–3:45; WO-2 P3 (40) 1:00–6:00 | 0.9103 (4:22–5:16) / 0.1724 (5:50–6:00) / 0.5532 (5:16–5:50) / 3.3641 (1:00–4:22). Sum 5.0000 | A-DIST-005, A-INV-001/003 |
| 6 | Before: WO-1 P1 (100) 2:00–4:00, WO-2 P2 (50) 3:00–6:00. After: WO-1 P1 → 2:00–5:00 | Before 1.6667 / 2.3333; after 2.3333 / 1.6667; impact **+0.6667 / −0.6667** | A-ADJ-001/006 |
| 7 | Same plot (100 ac) in two WOs: WO-1 2:00–4:00, WO-2 3:00–5:00. After: WO-1 → 2:00–4:30 | Before 1.5000 / 1.5000; after 1.7500 / 1.2500; impact **+0.2500 / −0.2500** | A-ADJ-001/006 |
| 8 | Case 5 setup; WO-1 P1 → 2:00–5:00 | P1 0.9103→1.6246 (**+0.7143**); P2 0.1724→0.1724 (0); WO-2 P1 0.5532→0.5532 (0); P3 3.3641→2.6498 (**−0.7143**). Totals 5.0000 both | A-ADJ-003/006 |
| 9 | WO-1 P1 (50) 2:00–4:00, WO-2 P2 (100) 3:00–4:00 distribute to 1.3333 (2:00–3:20) / 0.6667 (3:20–4:00); then the 3:20–4:00 entry is deleted/voided | WO-1 stays 1.3333; WO-2 0.6667 → 0 (impact −0.6667). **No redistribution** (voided row excluded) | A-ADJ-009 (new) |
| 10 | Same start; WO-1 edited 2:00–3:20 → 2:00–3:00, WO-2 3:20–4:00 kept | WO-1 1.3333 → 1.0000 (**−0.3333**); WO-2 0.6667 (0). The 3:00–3:20 **gap is not distributed** | A-ADJ-010 (new) |

Spot-check any other tenant data with the same algorithm; do not hand-derive new expected values.

**Findings from the oracle (take to the product manager).**

| Ref | Finding |
|---|---|
| Q1 (partly answered) | Case 9 treats the **distributed, re-timed entries as the stored records** and a deleted one as *voided* and excluded. That supports "the existing entry is voided and replaced by distributed entries" (PSD p19–20) over "distributed in place" (p16). Hour-log rows already carry `isVoid` and `parentHourLogID`. **Confirm**, then close Q1. |
| Q8 (new) | Case 8 note: **"Resource Hours Adjustment will not impact Machine Hours Adjustment."** After an adjustment, resource and machine hours can differ (the Machine column keeps the *before* values). The PSD says adjustments recalculate "resource and machine hours" and Part A's other cases show them equal. Which is right? Needs its own cases once confirmed. |
| Q9 (new) | Case 7 counts the **same plot twice** in the total active acres (100 + 100, so 50/50). Is that intended, or should one plot's acres count once? |
| W1 | Workbook Case 8, "Delta / Impact" column (M115:M118), compares **resource-after to machine-before**, so its sign is the reverse of the resource impact (P1 shows −0.7143; the true resource impact is +0.7143). The "Before Final Hrs" column F is not used. Do not copy that column as an expected value. |
| W2 | Time-range strings are typed text, not formulas. The Case 5 scratch table (J52:O59) is leftover working. Case 9/10 mix text and real times. Cosmetic, but don't read these cells as live formulas. |
| W3 | Not covered by the workbook: different machine or resource (A-DIST-007/008), back-to-back (A-DIST-009), zero acres (A-DIST-010), rounding (A-INV-002), overnight (A-VAL-003), the prompt, validations and posting. Those cases keep their original expected values. |

### A1. Distribution matrix (P1, Functional)

Formula: `Weighted Hours = Overlap Hours × Plot Acres / Total Active Acres`.

| ID | Scenario | Test data | Expected |
|---|---|---|---|
| A-DIST-001 | Single plot, one WO | Plot A 10 ac, 08:00–12:00 | Plot A gets 4.00 h |
| A-DIST-002 | Two plots, fully overlapping, unequal acres | A 10 ac, B 30 ac, 08:00–12:00 | A 1.00 h, B 3.00 h |
| A-DIST-003 | Two plots, equal acres | A 20 ac, B 20 ac, 08:00–12:00 | 2.00 h each |
| A-DIST-004 | Partial overlap | A 08:00–12:00, B 10:00–14:00, equal acres | 08–10 all A (2.0); 10–12 split 1.0/1.0; 12–14 all B (2.0). A 3.0 h, B 3.0 h |
| A-DIST-005 | Three plots, same segment | 10/20/30 ac, 1 h segment | Shares 1/6, 2/6, 3/6; sum 1.00 h |
| A-DIST-006 | Same resource + machine across two WOs, overlapping | WO1 plot A, WO2 plot B, same window | Acre-weighted across both WOs, not per-WO |
| A-DIST-007 | Same resource, different machine, overlapping | — | No distribution; full duration each |
| A-DIST-008 | Same machine, different resource, overlapping | — | No distribution; full duration each |
| A-DIST-009 | Back-to-back, no gap | A ends 12:00, B starts 12:00 | No overlap, no prompt, no distribution |
| A-DIST-010 | Zero or missing-acre plot in a segment | Plot with 0 ac | No divide-by-zero / NaN; behaviour recorded (Q3) |

### A2. Invariants — assert on every A1 and A3 case (P1)

| ID | Rule | Expected |
|---|---|---|
| A-INV-001 | Total distributed ≤ actual working duration of the resource + machine | Sum never exceeds duration |
| A-INV-002 | Rounding drift on odd splits | Sum of rounded shares equals duration (Q3) |
| A-INV-003 | No double counting across WOs | Total across WOs = actual duration for the pair |
| A-INV-004 | Single active plot in a segment | Full segment hours to that plot |

### A3. Overlapping-entry prompt (P1/P2)

Prompt text (PSD p16): *An overlapping job entry already exists for this resource and machine. If you
continue, the existing entry in this work order will be distributed and the system will recalculate
hour distribution for all impacted overlapping plots and work orders. Do you want to continue?*

| ID | Case | Expected |
|---|---|---|
| A-OV-001 | New entry, same resource + machine + plot + WO, overlapping time | Prompt shown with the exact text |
| A-OV-002 | Cancel the prompt | No new entry; existing hours unchanged |
| A-OV-003 | Confirm the prompt | New entry created; existing entry handled per Q1 (voided vs distributed); impacted records recalculated |
| A-OV-004 | After confirm, other plots and WOs with same resource + machine overlap | Recalculated acre-weighted; user was warned it may affect them |
| A-OV-005 | Overlap against an entry in a different WO | Behaviour per Q2 |
| A-OV-006 | Different plot, same resource + machine, overlapping | Distribution without the same-plot prompt |
| A-OV-007 | Operator on mobile | Never shown the overlap prompt (per `hour-log-adjustment.md`) — manual / mobile |

### A4. Adjustments (P1)

`Adjustment Impact = After Update Hours − Before Update Hours`.

| ID | Case | Expected |
|---|---|---|
| A-ADJ-001 | Move end time later | Positive impact; additional hours added |
| A-ADJ-002 | Move end time earlier | Negative impact; hours reduced |
| A-ADJ-003 | Change plot | Old plot impact negative, new plot impact positive; both recalculated |
| A-ADJ-004 | Change resource | Impact on old and new resource records |
| A-ADJ-005 | Change machine | Impact on old and new machine records |
| A-ADJ-006 | Edit a record that overlaps an entry in another WO | Other WO's record recalculated too |
| A-ADJ-007 | Edit, then revert to original values | Net impact 0 |
| A-ADJ-008 | Before-hours, after-hours, impact stored | All three visible for audit |
| A-ADJ-009 | Delete / void one distributed entry (oracle Case 9) | Voided row excluded; remaining entry keeps its hours; **no redistribution**; impact −0.6667 on the voided row |
| A-ADJ-010 | Edit an entry so overlap disappears, leaving a gap (oracle Case 10) | Each entry keeps its own times; the gap is not distributed; impact only on the edited row |
| A-ADJ-011 | Adjust resource hours, then check machine hours (oracle Case 8 note) | Behaviour per Q8; do not assert until confirmed |

### A5. Validations (P1, Negative)

| ID | Case | Expected |
|---|---|---|
| A-VAL-001 | Job end < start | Blocked |
| A-VAL-002 | Job end = start | Blocked (spec: end must be *greater* than start) |
| A-VAL-003 | Entry spanning midnight | Split at 11:59 PM / 12:00 AM, consistent with Hour Log Adjustment |
| A-VAL-004 | Distribute / adjust after the WO's hours are posted | Not allowed ("after posting system will not allow distribution") |

### A6. Posting to D365 (P1, Functional)

| ID | Case | Expected |
|---|---|---|
| A-POST-001 | WO moves to **In Progress** | WO number synced to the D365 project activity (Sync Console) |
| A-POST-002 | Ad-hoc activity WO | WO title synced as the activity description |
| A-POST-003 | Manager adjusts hours, then approves | Posted expense journal hours match the adjusted, distributed total at the estimated resource rate |
| A-POST-004 | Approve with material consumption | Item journal posted |
| A-POST-005 | D365 returns failure | Failure message surfaced; message can be corrected and retried (Sync Console) |
| A-POST-006 | D365 returns success | Journal number returned and visible |
| A-POST-007 | Project Statement in D365 | Costs match the posted journals |

### A7. Roles (P2)

| ID | Case | Expected |
|---|---|---|
| A-ROLE-001 | Manager adjusts hours and approves | Allowed |
| A-ROLE-002 | Supervisor / Operator tries to approve | Not available |
| A-ROLE-003 | Mobile entry upsyncs | Appears on web WO Resources table |

### A8. Regression (P2)

| ID | Case | Expected |
|---|---|---|
| A-REG-001 | Hour Log Adjustment: Approve / Adjust / Reject | Unchanged (`@HLA` suite stays green) |
| A-REG-002 | **Create Adjustment** overlap prompt vs the new overlap prompt | No conflict or double prompt |
| A-REG-003 | **Spent Hours** column | Consistent with distributed hours |

---

## Part B — AgriERP Labor Variance Posting batch (D365 F&O)

Platform **D365**. Role: finance user who can run periodic tasks. Preconditions: Labor Absorption
account (e.g. 51011) with Plot/Field dimension postings; posted AgriERP project expense journals;
projects linked to Plot/Field; absorption account set in setup.

### B1. Setup and parameters (P1/P2)

| ID | Case | Expected |
|---|---|---|
| B-SET-001 | **AgriERP Management > Periodic Task > AgriERP Labor Variance Posting** | Exists |
| B-SET-002 | **AgriERP Management > Setup > AgriERP Labor Variance Setup** | Exists |
| B-SET-003 | New **Absorption Account** dropdown in AgriERP parameters | Lists Main Accounts; editable |
| B-SET-004 | Leave each of From Date, To Date, Posting Date, Journal Name empty | Run blocked (all mandatory) |
| B-SET-005 | Batch Processing Yes / No | Both run (optional) |
| B-SET-006 | From Date after To Date | Not specified — record behaviour |
| B-SET-007 | Absorption account not set | Process stops with an error |

### B2. Variance calculation — `Variance = Labor Absorption GL − Project Expense` (P1)

| ID | Case | Expected |
|---|---|---|
| B-VAR-001 | GL > project expense for a plot | Positive; amount in **Debit** column |
| B-VAR-002 | GL < project expense | Negative; amount in **Credit** column |
| B-VAR-003 | GL = project expense | No journal line |
| B-VAR-004 | Two plots with variance | One line per plot |
| B-VAR-005 | One plot with variance, one without | Only the variance plot gets a line |
| B-VAR-006 | Transactions on From Date and To Date | Included |
| B-VAR-007 | Transactions one day outside the range | Excluded |
| B-VAR-008 | Unposted GL or expense transactions | Ignored |
| B-VAR-009 | GL account other than Labor Absorption | Ignored |
| B-VAR-010 | Several expense journals (incl. different WOs) on one plot | Aggregated per plot |
| B-VAR-011 | Decimal amounts, non-trivial rounding | Matches hand calculation |

### B3. Journal content and mapping (P1)

Verify per FDD §2.6: Name from the batch parameter; Journal number OOTB; Date = Posting Date;
Account type = Project; Account = Project ID; Debit / Credit per sign; Offset account type =
Ledger; Offset account + dimensions from the Direct Labor GL (Paycom GL default dimension);
Resource from the AgriERP consumption journal; Category, Currency, Line Property = D365 OOTB;
journal carries all financial dimensions of the absorption account line.

### B4. Activity number derivation (P1)

| ID | Case | Expected |
|---|---|---|
| B-ACT-001 | Absorption line has Farming Activity | Activity number = WBS line whose Operation ID equals the Farming Activity |
| B-ACT-002 | Cost Center **3510 – Overhead (General Farm)** | Operation ID defaulted to **1720 – Farm Overhead**; Activity number from the 1720 WBS line |
| B-ACT-003 | 3510, but project WBS has no 1720 line | Error / logged (negative) |
| B-ACT-004 | Non-3510 line with no Farming Activity | Error / logged (negative) |

### B5. Errors and duplicates (P1)

| ID | Case | Expected |
|---|---|---|
| B-ERR-001 | GL line with no Plot/Field dimension | Logged, not silently dropped |
| B-ERR-002 | Project with no Plot/Field mapping | Logged |
| B-ERR-003 | Journal validation fails | Journal not posted; error shown to the user |
| B-ERR-004 | Run twice for the same period and plot | No duplicate variance (Q6) |
| B-ERR-005 | Overlapping, non-identical date ranges | Duplicate prevention outcome recorded (Q6) |
| B-ERR-006 | Fix the data after a failed run, re-run | Posts cleanly |

---

## Part C — End-to-end chain (P1, the one scenario to run first)

1. Choose a test project and plot with Labor Absorption postings in the period (Paycom GL).
2. Farm App: create and run a WO with known hours, including one multi-plot overlap (A-DIST-002).
   Approve; confirm the project expense journal posts with the distributed hours (A-POST-003).
3. Compute the expected variance by hand per plot: GL absorption − sum of project expense.
4. D365: run **AgriERP Labor Variance Posting** for the period.
5. Verify journal lines (sign, Debit/Credit, dimensions, Activity number) and the Project Statement
   against step 3. A distribution error in Part A surfaces here as a variance error.

## Automation notes

**Feasibility probe, 2026-10-05 (read-only, QA, WO id 31393).** Part A is **not automatable yet**:

- `GET /api/WorkOrder/HourLogs` rows carry only `hours`, `standardHours`, `startDateTime` /
  `endDateTime`, `isVoid`, `parentHourLogID`, `details`, `fieldCode`, `projectCode`, `journalId`,
  `approvalStatus`. There is **no** weighted-hours, acre-share, before/after-hours or adjustment-impact
  field, so A-DIST, A-INV and A-ADJ-008 have nothing to assert on. Either the distribution feature
  is not on QA yet, or its output is not exposed. Re-probe when it ships.
- Seeding arbitrary start/end by `POST /api/WorkOrder/HourLogs` is unreliable (intermittent 500;
  stores its own times; see `api/hour-log-requests.mts`). The reliable route is a change request
  raised by the operator and approved by the manager (`seed:hourlog`), which only creates
  single-field entries.
- Admin token had expired; `pnpm auth:qa` refreshed it. `ApiClient` routes take no `/api/` prefix.

When the feature ships, the first spec to write is the overlap prompt (A-OV) in the UI, then A-DIST
via `GET /api/WorkOrder/HourLogs` once a distributed-hours field exists.

**API spec check, 2026-10-05.** `refresh.sh` found the live QA Swagger **identical** to the repo's
`openapi.json` (578 operations, no files changed). It has no path, schema or property for
distributed, weighted or adjustment-impact hours (the only `variance` hit is the unrelated
`Statistics.variance`). The tenant Feature Set also has 9 toggles with no name in the API
(types 52 and 59–61 Enabled; 62–66 Disabled), but the spec carries no enum for them, so none can be
tied to this feature. Conclusion: the backend API does not expose the feature yet; any distribution
may happen server-side (or on mobile) with only the stored hour logs visible. Next step is
observational: create the Case 2 setup on a fresh `QA …` WO and read `GET /api/WorkOrder/HourLogs`.

**QA observation 1 — Case 1 (A-DIST-001), 2026-10-05, WO-1440 (id 31464, "Test", Planned,
Fertilization, In Progress; made by hand with a short run).** One plot line (Test_Field TF1, 100 ac),
one resource (Agrierp 08), **no machine/asset**. One hour log `Log-0001`, scheme `Actual`, status
Completed, not void: 13:53:29–13:58:03 UTC, **stored `hours` 0.0761111111 = 274 s / 3600 = the raw
duration; `standardHours` null.** Passes Case 1 (single plot, no split). Caveats: (1) no machine, so
the resource + machine pairing is untested; (2) a lone entry always keeps its full duration, so this
cannot show whether the feature is live — that needs Case 2; (3) hours are stored to the second with
no rounding, which bears on Q3 (the oracle's minute-rounded ranges are display only).

**What the oracle changes (2026-10-05).** The expected values are now known (A0), so the missing
piece is only the actual-value source. Doable now, with no QA data: port the verified segment
algorithm to a pure TypeScript function with the oracle cases as fixtures and run it as a
browserless spec, so the reference is locked before the feature lands. Then the QA spec just feeds
the same fixtures through the app and diffs the result.

- Prompt cases (A-OV-001..004) need a UI spec once Q1 is answered.
- Part B has no API in the finops-api skill (`F3Agri*` services only); keep it manual in D365.
