# Test Plan — Hour Log Adjustment (Hour Log Change Requests)

- **Specs:** `playwright/tests/authenticated/hour-log-decisions.spec.ts` (main, `@mutating`) and
  `hour-log-adjustment.spec.ts` (opt-in, read-only)
- **Product spec:** `resources/product-specifications-document/AgriERP FSCM - Hour Log Adjustment.pdf` (PSD v1.0, Aug 17 2026)
- **QA workbook (web):** `resources/Vann Brothers test cases/Vann Brothers test cases/Hour_Log_Adjustment_Web_Test_Cases.xlsx`
- **Source of truth:** `vannbrosphasetwo-knowledge/references/hour-log-adjustment.md`
- **API contract:** `vannbrosphasetwo-vann-api-qa` → `reference/WorkOrder.md` (`HourLogChangeRequests*`, `HourAdjustmentsHistory`)
- **Automation status:** web side **mostly automated** (workbook: 57 of 93 browser-automatable web
  cases fully, 16 partly; see [Workbook alignment (web)](#workbook-alignment-web)):
  - **`hour-log-decisions.spec.ts`** (`@mutating`, fresh WO per run, 27 tests, ~5 min; green on
    Firefox 2026-09-29, the 26 before the WC-001 UI test also on Chromium) is the main suite:
    - `pnpm seed:hourlog` has the admin create the WO (operator Agrierp 07, a second Farm Hand who
      raises nothing, two machines) and set it to In Progress. The operator then raises one request
      per case: `approve`, `adjust`, `reject`, `gate` (left pending), `overlap`, `othermachine`,
      `double`, `nomachine` and `adjustoverlap`. They sit in a random 4-hour slot from the last 20 days.
    - The WO only moves forward: the A15 + B16 test moves it to **Review**, and it stays on QA as
      `QA HLA <timestamp>`, with every request decided. It is never sent back to To Do or deleted,
      and never completed to Done (Done posts to D365; see WC-003/WC-004 below).
    - **Expected failures** (`test.fail`, known QA defects): A08 (raise with no machine, knowledge
      ref #2), HLA-AD-008 (FINDINGS #43), HLA-B13 / OV-006 (#45), HLA-UI-006 (#46).
    - Occasional QA-data failure: a decision refused with `An existing hour log entry overlaps these
      hours and cannot be overridden…`. Hours from other WOs sit in the random slot, and no endpoint
      exposes them in advance. The error names this; rerun.
  - **`hour-log-adjustment.spec.ts`** is opt-in, for spot-checking a *real* WO during UAT: `HLA_WORK_ORDER_ID=<id>`.
  - Operator token: the saved `operator` session, bootstrapped once with `AUTH_ROLES=operator pnpm auth:qa`; later `pnpm auth:qa` runs refresh it.
  - Not automated: section A (mobile UI), B03 (no API to raise a change to an existing entry), C01,
    C02, C04, C05, and the workbook cases listed under
    [Not automated](#not-automated-and-why).
- **Live verification:** section B web labels verified live 2026-09-28 (WO-1283) and 2026-09-29
  (WO-1369, id 31393), including the Create Adjustment prompt. Mobile cases still use the PSD v1.0
  wording.
- **Last updated:** 2026-09-29 (workbook web gaps filled; overlap, audit and isolation automated)

**Scope:** the operator raises an hour change request on **mobile** (a change to a logged entry,
or a new entry for a run the app never recorded). The manager decides it on **web** in the
**Hour Log Change Requests** drawer: **Approve**, **Adjust** or **Reject**. The **Create
Adjustment** prompt resolves overlapping time. Decided hours flow back to mobile, into the audit
log, and to D365 for labour costing. Specs are tagged **`@HLA`**, and `--grep @HLA` runs exactly
this set. The web cases also carry `@TC:` / `@TC-partial:` tags for the QA team's workbook; see
[Workbook alignment (web)](#workbook-alignment-web).

**P1 smoke cases:** HLA-A03, HLA-A04, HLA-B01, HLA-B02, HLA-B04, HLA-B06, HLA-B09, HLA-B11, HLA-C03.

## Seeding the operator side through the API

The web cases need a pending request, and raising one on mobile is manual. Seed it instead:

| Step | Endpoint | Body / notes |
|---|---|---|
| Raise | `POST /api/WorkOrder/HourLogChangeRequests` | `workOrderId`, `fieldId`, `resourceId` (the operator), `requestedStartDateTime`, `requestedEndDateTime`, `machineResourceIds[]` (≥1), `implementResourceIds[]`, `reason`, `mobileDeviceType` (1 iOS / 2 Android); add `workOrderLineId` for a change to an existing entry, omit it for a new entry |
| Check the chip count | `GET /api/WorkOrder/{id}/HourLogChangeRequests/PendingByResource` | |
| List / read back | `GET /api/WorkOrder/{id}/HourLogChangeRequests?resourceId=&approvalStatus=` | `ApprovalStatus` 1 Unapproved, 2 Approved, 3 Rejected, 4 Adjusted |
| Decide (API-only variants) | `PUT /api/WorkOrder/HourLogChangeRequests/{requestId}/Decide` | `outcome`, `adjustedStart/EndDateTime`, `machineResourceIds`, `implementResourceIds`, `approverRemarks`, `rejectionReason`, `confirmOverride` |
| Overlaps | `GET /api/WorkOrder/HourLogChangeRequests/{requestId}/ExistingHourLogs` | |
| Audit | `GET /api/WorkOrder/HourAdjustmentsHistory?WorkOrderId=&ResourceId=` | |
| Teardown | `DELETE /api/WorkOrder/HourLogChangeRequests/{requestId}` | pending requests only |

> ⚠️ **Mutating.** Every decision writes the resource's hour log and an immutable audit entry on
> shared QA, and an approved decision feeds the D365 labour posting. Use one dedicated
> **In Progress** test WO. Approve/Adjust/Reject specs are **`@mutating`**.
>
> ⚠️ **Self-approval.** The web session that decides must **not** be the user the request is
> raised for (HLA-B15). Seed the request for an operator resource other than the logged-in admin.

---

## A) Mobile — Machine Operator (manual)

### HLA-A01 — Tab visibility by role

| Field | Content |
|---|---|
| **ID** | HLA-A01 |
| **Title** | The Hour Log Adjustment tab shows for Machine Operators only |
| **Module** | Work Orders → Hour Log Adjustment |
| **Role** | Machine Operator, Supervisor, Admin, Manager |
| **Platform** | Mobile |
| **Priority** | P2 |
| **Preconditions** | The feature is enabled in the Feature Set. An **In Progress** WO is assigned to each test user. |
| **Steps** | 1. Log in on mobile as a Machine Operator and open the WO. 2. Repeat as a Supervisor, an Admin and a Manager. |
| **Expected result** | The operator sees the **Hour Log Adjustment** tab. **Supervisor, Admin and Manager do not** see it. |
| **Type** | Functional / Permission |
| **API seed** | n/a |
| **Automation** | Manual |

### HLA-A02 — Entries grouped by field

| Field | Content |
|---|---|
| **ID** | HLA-A02 |
| **Title** | The tab lists approved hours grouped by field |
| **Role** | Machine Operator |
| **Platform** | Mobile |
| **Priority** | P2 |
| **Preconditions** | The operator has logged runs on ≥2 fields of an In Progress WO |
| **Steps** | 1. Open the WO → **Hour Log Adjustment**. 2. Read the header and the groups. |
| **Expected result** | The top of the tab shows the approved hours and the number of entries. Entries are grouped **by field**, each group with its count and total. Each entry shows **only** the date, start time, end time and duration, plus an **edit** and a **delete** action. No asset detail is shown in the list. |
| **Type** | Functional |
| **API seed** | Cross-check against `GET /api/WorkOrder/HourLogs` |
| **Automation** | Manual |

### HLA-A03 — Add New Request (happy path)

| Field | Content |
|---|---|
| **ID** | HLA-A03 |
| **Title** | Raise a new-entry request for a run the app never recorded |
| **Role** | Machine Operator |
| **Platform** | Mobile |
| **Priority** | **P1 smoke** |
| **Preconditions** | An In Progress WO with ≥1 field, ≥2 machines and ≥1 implement available |
| **Steps** | 1. **Hour Log Adjustment** → **Add New Request**. 2. Select **Field**. 3. Enter Job start date/time and Job end date/time. 4. Open **Machine** and tick 2 machines. 5. Pick 1 **Implement**. 6. Enter **Reason**. 7. Send. |
| **Test data** | Start `07/29/2026 3:05 PM`, end `07/29/2026 4:40 PM`, Reason `Afternoon run never recorded — app was closed.` |
| **Expected result** | **Duration** shows `1h 35m`, read-only. **Machine** shows `2 selected`. The sheet states the request goes to the manager for approval. After sending, the approved hours on the tab are **unchanged** until a manager decides. On web the request appears as a **new entry** with **Not logged**. |
| **Type** | Smoke / Functional |
| **API seed** | Web-side equivalent: `POST /api/WorkOrder/HourLogChangeRequests` with no `workOrderLineId` |
| **Automation** | Manual (mobile). Web half is covered by HLA-B03. |

### HLA-A04 — Request Hour Change on an existing entry

| Field | Content |
|---|---|
| **ID** | HLA-A04 |
| **Title** | Edit a logged entry and raise a change request |
| **Role** | Machine Operator |
| **Platform** | Mobile |
| **Priority** | **P1 smoke** |
| **Preconditions** | The operator has a logged entry, e.g. `6:12 AM – 11:48 AM` (`5h 36m`) |
| **Steps** | 1. Tap **edit** on the entry. 2. Check the **Request Hour Change** sheet. 3. Change start to `5:45 AM` and end to `12:30 PM`. 4. Enter a Reason. 5. Send. |
| **Expected result** | The app-logged hours are shown at the top for reference. The machines and implements are pre-selected from the entry. Duration = `6h 45m`, read-only. After sending, the entry **still shows `5h 36m`** until a manager decides. |
| **Type** | Smoke / Functional |
| **API seed** | `POST …/HourLogChangeRequests` with `workOrderLineId` set |
| **Automation** | Manual |

### HLA-A05 … A10 — Mandatory-field and time validations (one case each)

| ID | Title | Steps (from **Add New Request**, all other fields valid) | Expected result (verbatim) | Priority |
|---|---|---|---|---|
| **HLA-A05** | Field missing blocks the send | Leave **Field** empty; send | `Select a field.` Request not sent. | P2 |
| **HLA-A06** | Start missing blocks the send | Leave Job start date/time empty; send | `Enter the start date and time.` | P2 |
| **HLA-A07** | End missing blocks the send | Leave Job end date/time empty; send | `Enter the end date and time.` | P2 |
| **HLA-A08** | No machine blocks the send | Tick no machine; send | `Select at least one machine.` | P2 |
| **HLA-A09** | Job end ≤ start is flagged at once and blocks the send | Set end = start, then end < start, without sending; then send | `The job end must be after the job start.` shows **under Job end as soon as** the times conflict, and the same message blocks the send. Test both equal and earlier. | P1 |
| **HLA-A10** | Reason missing blocks the send | Leave **Reason** empty; send | `Add a short reason — your manager needs it to approve.` | P2 |

Role: Machine Operator · Platform: Mobile · Type: Negative · Automation: Manual. The API side of each rule
can be probed with `POST …/HourLogChangeRequests` and missing or inverted values. It **should**
return 400; a 200 is a finding, since the mobile check alone does not protect the backend.

> **Automation (A05–A10):** the server-side half of A09 and A10 is automated at API level in
> `hour-log-decisions.spec.ts`, and the messages match the table exactly. A08 is an expected failure there: QA
> accepts a request with no machine (knowledge ref, QA findings #2). A05–A07 and the mobile UI
> behaviour are manual.

### HLA-A11 — Implement is optional

| Field | Content |
|---|---|
| **ID** | HLA-A11 |
| **Title** | A request with machines but no implement is accepted |
| **Role** | Machine Operator · **Platform** Mobile · **Priority** P3 |
| **Steps** | Fill every required field, leave **Implement** empty, send. |
| **Expected result** | The request is sent with no validation message. |
| **Type** | Functional · **Automation** Manual |

### HLA-A12 — Duration is read-only

| Field | Content |
|---|---|
| **ID** | HLA-A12 |
| **Title** | Duration is system-calculated and cannot be typed over |
| **Role** | Machine Operator · **Platform** Mobile (and Web Adjust) · **Priority** P2 |
| **Steps** | 1. Enter start/end. 2. Try to focus and type into **Duration**. 3. Change the end time. |
| **Expected result** | Duration cannot be edited, and it recalculates when the end time changes. The same holds for the web **Adjust** form (its **Approve &lt;duration&gt;** label recalculates). |
| **Type** | Functional · **Automation** Manual (web half automatable in HLA-B05) |

### HLA-A13 — Field dropdown restricted to the work order

| Field | Content |
|---|---|
| **ID** | HLA-A13 |
| **Title** | Only the WO's own fields are offered |
| **Role** | Machine Operator · **Platform** Mobile · **Priority** P2 |
| **Preconditions** | The WO covers fields F1 and F2; the farm has other fields |
| **Steps** | Open **Field** in Add New Request. |
| **Expected result** | Only F1 and F2 are listed. API probe: a `POST` with a `fieldId` outside the WO should be rejected. |
| **Type** | Functional / Negative · **API seed** `POST …/HourLogChangeRequests` with a foreign `fieldId` · **Automation** Manual |

### HLA-A14 — Machine / Implement multi-select behaviour

| Field | Content |
|---|---|
| **ID** | HLA-A14 |
| **Title** | Machine dropdown stays open for several picks and summarises the selection |
| **Role** | Machine Operator · **Platform** Mobile · **Priority** P3 |
| **Steps** | 1. Open **Machine**. 2. Tick 3 machines one after another. 3. Tap away. 4. Repeat for **Implement** and search for one by name. |
| **Expected result** | Every machine is listed with a checkbox, and the list stays open between ticks. After tapping away the control shows `3 selected`. **Implement** behaves the same way and is searchable. |
| **Type** | Functional · **Automation** Manual |

### HLA-A15 — Requests allowed only while In Progress

| Field | Content |
|---|---|
| **ID** | HLA-A15 |
| **Title** | No new request once the WO is in Review |
| **Role** | Machine Operator · **Platform** Mobile · **Priority** P1 |
| **Steps** | 1. On an **In Progress** WO, check that **Add New Request** and **edit** are available. 2. Move the WO to **Review**. 3. Reopen the tab. |
| **Expected result** | In **Review**, no new request can be raised: **Add New Request** and **edit** are unavailable. API probe: a `POST` for a Review WO should be refused. |
| **Type** | Negative · **API seed** `POST …/HourLogChangeRequests` against a Review WO · **Automation** Automated at API level — `hour-log-decisions.spec.ts` (raise in Review → 400 `This job can only be adjusted while the work order is In Progress.`); mobile UI manual |

### HLA-A16 — Offline save and sync

| Field | Content |
|---|---|
| **ID** | HLA-A16 |
| **Title** | A request prepared offline syncs on reconnect, and offline validations still apply |
| **Role** | Machine Operator · **Platform** Mobile · **Priority** P2 |
| **Steps** | 1. Turn on airplane mode. 2. Try to save a request with end ≤ start (expect it blocked). 3. Save a valid request. 4. Reconnect. 5. On web, open the WO. |
| **Expected result** | Step 2 is blocked with `The job end must be after the job start.` Step 3 saves offline. After reconnecting, the request reaches web with the same times, machines, implements and reason. A decision made while the device was offline appears in the mobile hour log at the next sync. |
| **Type** | Functional · **Automation** Manual |

### HLA-A17 — Overnight run split at midnight

| Field | Content |
|---|---|
| **ID** | HLA-A17 |
| **Title** | A run across midnight becomes two entries |
| **Role** | Machine Operator (raise) + Manager (approve) · **Platform** Mobile + Web · **Priority** P2 |
| **Test data** | Start `07/29/2026 10:00 PM`, end `07/30/2026 2:00 AM` |
| **Steps** | Raise the request, approve it on web, then view the operator's hour log. |
| **Expected result** | Two entries: `07/29 10:00 PM – 11:59 PM` and `07/30 12:00 AM – 2:00 AM`. |
| **Type** | Edge · **API seed** `POST …/HourLogChangeRequests` + `PUT …/Decide` (outcome 2), then `GET /api/WorkOrder/HourLogs` · **Automation** API-automatable |

### HLA-A18 — No overlap prompt on mobile

| Field | Content |
|---|---|
| **ID** | HLA-A18 |
| **Title** | The operator is never asked about overlapping time |
| **Role** | Machine Operator · **Platform** Mobile · **Priority** P2 |
| **Steps** | Raise a request whose time overlaps an existing entry of the same resource and machine. |
| **Expected result** | The request is sent normally, and **no Create Adjustment prompt** appears on mobile. The overlap is resolved on web (HLA-B11). |
| **Type** | Functional · **Automation** Manual |

---

## B) Web — Farm Manager

### HLA-B01 — Hour Log Changes column and "N To Review" chip

| Field | Content |
|---|---|
| **ID** | HLA-B01 |
| **Title** | Resources with pending requests show an `N To Review` chip |
| **Module** | Work Orders → WO detail → Resources |
| **Role** | Manager / Admin |
| **Platform** | Web |
| **Priority** | **P1 smoke** |
| **Preconditions** | 2 pending requests seeded for resource R1 and none for R2, on an In Progress WO |
| **Steps** | 1. **Work Orders** → open the WO. 2. Go to the **Resources** table. |
| **Expected result** | The table has `Resource Name` · `Resource Type` · `Tracking Log` · `Progress` · `Spent Hours` · **Hour Log Changes** columns. R1 shows `2 To Review`, and R2 has no chip. The chip can also show on **Machine** resource rows. The count matches `GET /api/WorkOrder/{id}/HourLogChangeRequests/PendingByResource`. |
| **Type** | Smoke / Functional |
| **API seed** | 2× `POST …/HourLogChangeRequests` for R1 |
| **Automation** | **Automated**: `hour-log-decisions.spec.ts` (fresh WO: all columns incl. **Company**, exact `9 To Review`, `—` and no chip for the second Farm Hand, Spent Hours 0 while all are pending); `hour-log-adjustment.spec.ts` checks a real WO |

### HLA-B02 — Drawer content for a change request

| Field | Content |
|---|---|
| **ID** | HLA-B02 |
| **Title** | The drawer shows logged, requested and change for each request |
| **Role** | Manager / Admin · **Platform** Web · **Priority** **P1 smoke** |
| **Preconditions** | A change request on an entry logged `6:12 AM – 11:48 AM`, requesting `5:45 AM – 12:30 PM`, device iOS |
| **Steps** | Click R1's **N To Review** chip. |
| **Expected result** | The drawer is titled **Hour Log Change Requests**, with subtitle `<Resource> (<code>) · <WO> · N Needs Review` (e.g. `Agrierp 07 (07) · WO-1283 · 2 Needs Review`), and shows one card per pending request. The card shows `REQ-nnnn`, an `IOS` badge, `<field code> (<project>) · MM/DD/YYYY` (e.g. `320 (PRJ_000067) · 09/09/2026`) and a **Machine:** line. Panels: **LOGGED BY APP** (app's times/duration), **Requested** `hh:mm AM - hh:mm PM` / `Nh:MMm` (e.g. `06:01 PM - 10:46 PM` / `4h:45m`, browser local time), **CHANGE** (difference on spent hours). The reason text follows. Actions: **Approve &lt;Nh:MMm&gt;** (e.g. `Approve 4h:45m`), **Adjust**, **Reject**. Live 2026-09-28 showed no `Job Log-…` or `by <raised by>` line, and only the **Requested** panel on new-entry requests. |
| **Type** | Smoke / Functional |
| **API seed** | `POST …/HourLogChangeRequests` with `workOrderLineId`, `mobileDeviceType: 1` |
| **Automation** | **Automated** except the LOGGED BY APP / CHANGE panels (not reachable, see B03): title, close X, subtitle count, newest-first order, and per card REQ no., badge, machines, Requested times, reason and the three buttons |

### HLA-B03 — New-entry request shows "Not logged"

| Field | Content |
|---|---|
| **ID** | HLA-B03 |
| **Title** | A request with no original entry shows Not logged |
| **Role** | Manager / Admin · **Platform** Web · **Priority** P1 |
| **Preconditions** | A new-entry request (`3:05 PM – 4:40 PM`) is pending |
| **Steps** | Open the drawer. |
| **Expected result** | Per PSD: the header line ends `· new entry`, **LOGGED BY APP** reads **Not logged**, **CHANGE** = `+1h 35m`. Live 2026-09-28: new-entry requests show only the **Requested** panel (`3:05 PM - 4:40 PM` / `1h:35m`) and no `new entry` marker; the button reads **Approve 1h:35m**. |
| **Type** | Functional · **API seed** `POST …/HourLogChangeRequests` without `workOrderLineId` · **Automation** Not reachable: the create API has no field for the entry being changed, so B03's "change" cannot be seeded. New-entry cards show only **Requested** (asserted in B02) |

### HLA-B04 — Approve as submitted

| Field | Content |
|---|---|
| **ID** | HLA-B04 |
| **Title** | Approve writes the requested hours and updates Spent Hours immediately |
| **Role** | Manager / Admin · **Platform** Web · **Priority** **P1 smoke** |
| **Steps** | 1. Note R1's **Spent Hours**. 2. Open the drawer and click **Approve &lt;Nh:MMm&gt;** (e.g. `Approve 6h:45m`). |
| **Expected result** | The request leaves the pending list, and the chip count drops by 1 (or disappears). R1's **Spent Hours** rises by `1h:09m` without a page reload. The API shows status **Approved** (2) with final = requested times. |
| **Type** | Smoke / Functional · **API seed** HLA-B02 seed · **Automation** Automated: `hour-log-decisions.spec.ts` (no prompt while overlapping requests are only pending, drawer count −1, Spent Hours +exactly the request without reload, final = requested, hour log for operator and machine, other resource untouched, a second decision refused, **Hours Logged** shows the entry) |

### HLA-B05 — Adjust times, assets and note

| Field | Content |
|---|---|
| **ID** | HLA-B05 |
| **Title** | Adjust lets the manager change times, machines and implements, and add a note |
| **Role** | Manager / Admin · **Platform** Web · **Priority** P1 |
| **Steps** | 1. Click **Adjust** and check that **Set The Hours Yourself** appears. 2. Open **Machine**: the current machine is selected (shown as a `×` chip); add a 2nd. 3. Open **Implement** (`Select Implement` when empty) and pick one. 4. Set **Job Start\*** `06:00 AM`, keep **Job End\*** `12:30 PM`. 5. In **Remarks\*** (**Note For The Operator**) enter `Yard time is not counted — approving from 6:00.` 6. Click **Approve Hours**. |
| **Expected result** | **Approve Hours** stays disabled until **Remarks\*** is filled (Remarks are mandatory on live, unlike the PSD's optional note). After approving: status **Adjusted** (4), final = `6:00 AM – 12:30 PM`, and **Spent Hours** reflects `6h 30m` for that entry. The machines and implements saved are the adjusted set, and the note is stored as `approverRemarks`. |
| **Type** | Functional · **Automation** Automated: adds the 2nd machine (1st stays), start +15 min, note → **Adjusted** with those times, both machines, the note, and a 0.75 h entry. Pre-fill is checked in B07 |

### HLA-B06 — Adjust: job end must be after job start (web)

| Field | Content |
|---|---|
| **ID** | HLA-B06 |
| **Title** | The web Adjust form refuses end ≤ start |
| **Role** | Manager / Admin · **Platform** Web · **Priority** **P1** |
| **Steps** | **Adjust**; fill **Remarks\***; set **Job End\*** equal to **Job Start\***, then earlier; try to approve. |
| **Expected result** | `The Job End Must Be After The Job Start` appears and **Approve Hours** is disabled; nothing is decided (the request stays `Needs Review`). Also: **Approve Hours** is disabled while **Remarks\*** is empty and enabled once filled. |
| **Type** | Negative · **API probe** `PUT …/Decide` outcome 4 with inverted times should return 400 · **Automation** Automated: `hour-log-decisions.spec.ts` (end = start and end < start; no Field selector) |

### HLA-B07 — Adjust: Cancel changes nothing

| Field | Content |
|---|---|
| **ID** | HLA-B07 |
| **Title** | Cancelling Adjust leaves the request pending |
| **Role** | Manager / Admin · **Platform** Web · **Priority** P3 |
| **Steps** | **Adjust** → change the values → **Cancel**. |
| **Expected result** | **Set The Hours Yourself** collapses, the card shows its `REQ-nnnn` and **Approve &lt;Nh:MMm&gt;** again, and after reloading the WO the `N To Review` chip is unchanged. Spent Hours is unchanged. |
| **Type** | Functional · **Automation** Automated: values changed then Cancel; API still Unapproved with the requested times |

### HLA-B08 — Reject needs a reason

| Field | Content |
|---|---|
| **ID** | HLA-B08 |
| **Title** | Confirm Reject is blocked without a rejection reason |
| **Role** | Manager / Admin · **Platform** Web · **Priority** P2 |
| **Steps** | **Reject**; leave **Reason Shown To The Operator** empty; try **Confirm Reject**; then type a reason; then **Cancel**. |
| **Expected result** | **Reject This Change** shows `Logged Hours Stay As The Spent Hours`. **Confirm Reject** is disabled while the reason is empty and enabled once one is typed. **Cancel** collapses the section; the request stays pending. |
| **Type** | Negative · **API probe** `PUT …/Decide` outcome 3 with no `rejectionReason` should return 400 · **Automation** Automated: also a spaces-only reason → `Reason Is Required`; API still Unapproved, no audit entry |

### HLA-B09 — Reject a change request

| Field | Content |
|---|---|
| **ID** | HLA-B09 |
| **Title** | Reject keeps the app's hours and records the reason |
| **Role** | Manager / Admin · **Platform** Web · **Priority** **P1 smoke** |
| **Steps** | **Reject** → **Reason Shown To The Operator** `Yard time is not productive time on this work order.` → **Confirm Reject**. |
| **Expected result** | The request leaves the pending list with status **Rejected** (3). The entry stays `6:12 AM – 11:48 AM` (`5h:36m`), and **Spent Hours** is unchanged. The reason is visible to the operator on mobile (HLA-C04). |
| **Type** | Smoke / Functional · **Automation** Automated: **Rejected**, reason stored, no entry added, Spent Hours unchanged, chip = remaining pending |

### HLA-B10 — Reject a new-entry request adds nothing

| Field | Content |
|---|---|
| **ID** | HLA-B10 |
| **Title** | Rejecting a Not-logged request creates no hour log entry |
| **Role** | Manager / Admin · **Platform** Web · **Priority** P2 |
| **Steps** | Reject the HLA-B03 request with a reason. |
| **Expected result** | No entry is added to the resource's hour log (`GET /api/WorkOrder/HourLogs` count unchanged), and Spent Hours is unchanged. |
| **Type** | Functional · **Automation** Covered by B09: every seeded request is a new entry |

### HLA-B11 — Create Adjustment prompt: Continue redistributes

| Field | Content |
|---|---|
| **ID** | HLA-B11 |
| **Title** | Approving an overlapping request prompts, and Continue redistributes |
| **Role** | Manager / Admin · **Platform** Web · **Priority** **P1 smoke** |
| **Preconditions** | R1 has an entry `06:45 AM – 08:30 AM` on machine M1 (possibly on another WO). A pending request for R1 on M1 overlaps it. |
| **Steps** | 1. Click **Approve &lt;Nh:MMm&gt;** (or **Adjust** → **Approve Hours**). 2. Read the modal. 3. Click **Continue**. |
| **Expected result** | The **Create Adjustment** modal shows `The Selected Time Overlaps With Existing Job Time For The Same Resource And Machine`. The **Existing Overlapping Entries** table (`Work Order` · `Plot` · `Machine` · `Time`) lists the clashing entry, matching `GET …/{requestId}/ExistingHourLogs`. The modal text continues `If You Continue The System Will Redistribute Hours For All Impacted Overlapping Entries. Do You Want To Continue?` On **Continue**, the request is decided and the impacted entries are redistributed so no minute on M1 is counted twice. The audit records redistribution applied. |
| **Type** | Smoke / Functional · **API seed** 2 overlapping requests, or a logged entry + a request · **Automation** Automated (`HLA-B11 + HLA-B12`): prompt wording, columns (`Work Order · Plot · Machine · Start Date · End Date`), the clashing row, then Continue → Approved with `OverrideConfirmed`, no overlapping entries left, superseded entry in `HourAdjustmentsHistory`, Spent Hours = entries. Live: the overlapped entry is removed whole (FINDINGS #44). Also `HLA-OV-012` (Adjust one minute into approved time → prompt → Cancel) |

### HLA-B12 — Create Adjustment prompt: Cancel decides nothing

| Field | Content |
|---|---|
| **ID** | HLA-B12 |
| **Title** | Cancel on the overlap prompt leaves everything as it was |
| **Role** | Manager / Admin · **Platform** Web · **Priority** P1 |
| **Steps** | As HLA-B11, but click **Cancel**. |
| **Expected result** | The modal closes. The request stays pending, and neither entry changes. |
| **Type** | Negative · **Automation** Automated in `HLA-B11 + HLA-B12` (Cancel → still pending, no audit entry) |

### HLA-B13 — No prompt when the overlap is on a different machine

| Field | Content |
|---|---|
| **ID** | HLA-B13 |
| **Title** | Time overlap with no shared machine does not trigger Create Adjustment |
| **Role** | Manager / Admin · **Platform** Web · **Priority** P2 |
| **Preconditions** | R1 has an entry on M1. The request overlaps it in time but uses M2 only. |
| **Steps** | **Approve &lt;Nh:MMm&gt;**. |
| **Expected result** | No prompt; the request is approved directly. |
| **Type** | Edge · **Automation** Automated, **expected failure**: the prompt appears because the operator's own entry overlaps (FINDINGS #45) |

### HLA-B14 — Per-resource isolation

| Field | Content |
|---|---|
| **ID** | HLA-B14 |
| **Title** | Deciding R1's request never changes R2's entries |
| **Role** | Manager / Admin · **Platform** Web · **Priority** P1 |
| **Preconditions** | R1 and R2 on the same WO share a machine and overlapping time |
| **Steps** | Approve R1's request (with Continue if prompted). Compare R2's entries before and after. |
| **Expected result** | R2's hour log entries and **Spent Hours** are identical before and after. Only R1's log changes. |
| **Type** | Functional / Negative · **API** `GET /api/WorkOrder/HourLogs` for R2 before and after · **Automation** Automated for a second Farm Hand who raises nothing (B04 and the overlap test: no entries, Spent Hours unchanged). A shared machine across two operators needs a second operator token |

### HLA-B15 — Self-approval restriction

| Field | Content |
|---|---|
| **ID** | HLA-B15 |
| **Title** | A user cannot decide their own request |
| **Role** | A user who both raises requests and holds the decide permission · **Platform** Web · **Priority** P1 |
| **Steps** | Raise a request as user U, then open the drawer as U. |
| **Expected result** | **Approve**, **Adjust** and **Reject** are unavailable or refused for U's own request. API probe: `PUT …/Decide` with U's token returns 403 or 400. |
| **Type** | Permission / Negative · **Automation** Automated — `hour-log-decisions.spec.ts` (API: raiser's Decide → 401, request stays Unapproved) |

### HLA-B16 — WO completion blocked while requests are pending

| Field | Content |
|---|---|
| **ID** | HLA-B16 |
| **Title** | A WO cannot be completed with a pending hour log request |
| **Role** | Manager / Admin · **Platform** Web · **Priority** P1 |
| **Preconditions** | A WO in **Review** with a pending request raised while it was In Progress |
| **Steps** | **Work Order Completed** → **Approve**. |
| **Expected result** | Completion is refused with a message about the pending hour log adjustment requests, and the WO stays in **Review**. After deciding the request, completion succeeds (`Done`). |
| **Type** | Negative · **Automation** Automated — `hour-log-decisions.spec.ts` (API: Done refused — `This work order has a pending hour-log change request…`) |

### HLA-B17 — REQ number sequence

| Field | Content |
|---|---|
| **ID** | HLA-B17 |
| **Title** | Request numbers are unique and run in sequence |
| **Role** | Manager / Admin · **Platform** Web · **Priority** P3 |
| **Steps** | Seed 3 requests in a row and open the drawer. |
| **Expected result** | The numbers are `REQ-nnnn`, zero-padded, consecutive and unique (e.g. `REQ-0151`, `REQ-0152`, `REQ-0153`; QA was at `REQ-015x` on 2026-09-28). |
| **Type** | Functional · **API seed** 3× `POST …/HourLogChangeRequests` · **Automation** Automated — `hour-log-decisions.spec.ts` (API: seeded numbers `REQ-nnnn`, ascending, unique) |

---

## C) Cross-cutting

### HLA-C01 — Feature Set off hides every action

| Field | Content |
|---|---|
| **ID** | HLA-C01 |
| **Title** | With the feature disabled, no hour log request action is available |
| **Role** | Admin (toggle); Operator + Manager (check) · **Platform** Web + Mobile · **Priority** P2 |
| **Steps** | 1. Disable Hour Log Change Requests in the Feature Set. 2. Check mobile and web. 3. Re-enable it. |
| **Expected result** | Disabled: no **Add New Request** or **edit** on mobile, and no **Hour Log Changes** chip, **Approve**, **Adjust** or **Reject** on web. Re-enabled: all of them return. |
| **Type** | Functional · **API** `GET /api/FeatureSet` shows the flag · **Automation** Manual (tenant-wide toggle on shared QA; don't automate) |

### HLA-C02 — Manager notification on a new request

| Field | Content |
|---|---|
| **ID** | HLA-C02 |
| **Title** | Raising a request notifies the manager with the key details |
| **Role** | Operator (raise), Manager (receive) · **Platform** Mobile → Web · **Priority** P2 |
| **Steps** | Raise a request, then open the manager's notifications (bell). |
| **Expected result** | The notification names the **Work Order**, **Field**, **Resource**, requested hours and reason. |
| **Type** | Functional · **API seed** `POST …/HourLogChangeRequests` · **Automation** Planned |

### HLA-C03 — Audit log entry for every decision

| Field | Content |
|---|---|
| **ID** | HLA-C03 |
| **Title** | Approve, Adjust and Reject each write an audit entry |
| **Role** | Manager / Admin · **Platform** Web / API · **Priority** **P1 smoke** |
| **Steps** | After HLA-B04, B05 and B09, query `GET /api/WorkOrder/HourAdjustmentsHistory?WorkOrderId=<id>&ResourceId=<R1>` and check the audit view against the WO. |
| **Expected result** | One entry per decision. Each holds the original, requested and decided hours, the machines and implements, the reason, the manager note (Adjust), the rejection reason (Reject), redistribution applied (B11), decided by and decided at. Entries cannot be edited. |
| **Type** | Smoke / Functional · **Automation** Automated — `hour-log-decisions.spec.ts` (API: `HistoryLog` has `HourLogChangeRequestRaised` (Mobile) + `…Approved/Adjusted/Rejected` (Web) per request) |

### HLA-C04 — Mobile reflects the decision and the manager's note

| Field | Content |
|---|---|
| **ID** | HLA-C04 |
| **Title** | The operator sees the decided hours, the decision and the note |
| **Role** | Machine Operator · **Platform** Mobile · **Priority** P1 |
| **Steps** | After B04, B05 and B09, open the operator's **Hour Log Adjustment** tab (sync if offline). |
| **Expected result** | Approved: the entry shows the requested times. Adjusted: the manager's times and the note. Rejected: the original times and the rejection reason. The tab's approved-hours total matches web **Spent Hours**. |
| **Type** | Functional · **API** `GET /api/WorkOrder/{id}/HourLogChangeRequests/Mine` (operator token) · **Automation** Manual |

### HLA-C05 — Approved hours post to D365 for labour costing

| Field | Content |
|---|---|
| **ID** | HLA-C05 |
| **Title** | Only approved spent hours reach D365 |
| **Role** | Manager (web) → D365 reviewer · **Platform** Web + D365 · **Priority** P2 |
| **Preconditions** | A WO with one approved, one adjusted and one rejected request, then completed (`Done`) |
| **Steps** | After the sync batch job, review the WO's hour/expense journal in D365 (see `journals-postings.md`, and the Sync Console in `work-orders.md`). |
| **Expected result** | The labour hours posted per resource against the WO, task and field equal the web **Spent Hours**: the approved plus adjusted hours. Rejected hours are not posted, and pending hours never are (HLA-B16). |
| **Type** | Integration · **Automation** Manual (D365) |

---

## Case count

| Section | Cases |
|---|---|
| A) Mobile — Operator | 18 (A01–A18) |
| B) Web — Manager | 17 (B01–B17) |
| C) Cross-cutting | 5 (C01–C05) |
| **Total** | **40** |

---

## Workbook alignment (web)

The QA team's workbook `Hour_Log_Adjustment_Test_Cases.xlsx` (246 cases, PSD v1.0) was filtered
to its **95 Web cases** in the web workbook above. Its column **Q** says, per case, which test covers
it (generated from the spec titles) or why none does. `pnpm catalog` loads it into
`test-plans/catalog/web-cases.json` (tab **Hour Log Adjustment**), and `pnpm coverage` reports it.
Mobile, Integration and ERP cases stay in the full workbook, and section A and C04/C05 here cover
them.

The tests in `hour-log-decisions.spec.ts` that have no plan ID of their own are titled with the
workbook ID: HLA-RL-008, HLA-UI-006, HLA-RJ-009, HLA-AP-006, HLA-OV-012, HLA-AD-008 and HLA-WS-006.

### Plan case → workbook IDs

A full tag (`@TC:`) means the test asserts the whole expected result (against live wording where it
differs from the PSD). A partial tag (`@TC-partial:`) means part of it is not asserted.

| Test | `@TC` (full) | `@TC-partial` |
|---|---|---|
| HLA-B15 (API) | — | RL-010, RL-011, RL-012 (API 401 + no audit; the operator has no decide permission, unlike the workbook's user X) |
| HLA-RL-008 | RL-008 | — |
| HLA-B01 | WR-001, WR-002, WR-003, WR-004 | — |
| HLA-B02 | FS-003, WR-005, WD-001, WD-005 – WD-008, WD-011 | WD-002 (no Job Log / age / "by" line live), WD-010 (order only, 9 requests) |
| HLA-B06 | AD-010, AD-011, AD-013, AD-016 | AD-001 |
| HLA-B07 | AD-002, AD-014 | — |
| HLA-B08 | RJ-002, RJ-003, RJ-007 | RJ-001 (subtitle differs) |
| HLA-UI-006 | — | UI-006 (expected failure, #46) |
| HLA-B04 | AP-001 – AP-003, WR-006, WR-008, WR-011, WD-009, OV-015, PR-001 | AP-005, RL-009 (decided-by is set and is not the raiser), AP-007 (API second decision) |
| HLA-B13 | OV-006 (expected failure, #45) | — |
| HLA-RJ-009 | RJ-009 | — |
| HLA-B11 + B12 | OV-003, OV-004, OV-008, OV-017, AU-006, PR-002 | OV-001 (Start/End Date columns, not Time) |
| HLA-AP-006 | AP-006 | — |
| HLA-OV-012 | OV-010, OV-012 | — |
| HLA-B05 | AD-003, AD-006, AD-015, OV-009 | — |
| HLA-AD-008 | AD-008 (expected failure, #43) | — |
| HLA-B09 | RJ-005 | RJ-004 (a new entry has no original) |
| HLA-C03 (API) | AU-001 – AU-003, AU-007, DD-001, DD-002 | AU-004 (per request, no WO audit view), AU-005 (API only), DD-003 |
| HLA-A15 + B16 (API) | — | — (A15 and the API half of B16) |
| HLA-B16 (UI) | WC-001 (**Mark As Done** → **Approve This Work Order** → Approve → alert with the pending-request message; WO stays Review) | — |
| HLA-WS-006 | WS-006, WR-007 | — |

### Not automated, and why

| Workbook case | Why |
|---|---|
| WC-003, WC-004 | **On hold:** completing the WO to Done posts to D365. You approved it on 2026-09-29, but Claude Code's permission check blocked the edit. To enable it, allow it in the permission settings, then add a final test that calls `markAsDone()` after HLA-WS-006 and expects status **Done**. |
| WC-002, WR-010, OV-007, RL-013 | Need a second operator who can raise requests (or a manager who is also an operator). QA has one operator token. |
| WD-003, AP-004, OV-014 | Not reachable: the create API has no field for the entry being changed, so every request is a new entry. |
| WD-004, AD-005, AD-012 | Live differs from the PSD: new-entry cards show only **Requested**; Adjust's button reads **Approve Hours** with no duration, and there is no duration field. |
| AD-004, AD-009 | The seeded WO has no implements. |
| OV-013 | Blocked by FINDINGS #45 (any overlap on the operator prompts). |
| OV-002, OV-005, OV-011, VL-022, NT-004 | Planned. |
| FS-005, UI-004 | Manual (tenant-wide Feature Set toggle; browser matrix). |

### Where the workbook disagrees with live QA

The workbook follows the PSD mock-ups. Live QA (2026-09-28/29) differs as below. The specs assert
**live**; raise the rest with the QA team, since several answer open Clarifications.

| Workbook case | Workbook expects | Live QA |
|---|---|---|
| WR-002, WR-006, WD-001 | `2 to review`, `2 needs review` | Title case: `N To Review`, `N Needs Review` |
| WD-001 | Title `Hour Log Change Requests` | Singular `Hour Log Change Request` again on 2026-09-29 (it has flipped between the two) |
| WD-002 | `Field 342 · Job Log-0002 · Jul 29`, `19 days ago`, `by Carston Gunter` | `<field code> (<project>) · MM/DD/YYYY`; no Job Log, age or "by" line |
| WD-004 | `new entry` tag, `NOT LOGGED —` panel | Only the **Requested** panel |
| WD-005 | Machines separated by `·` | Each machine on its own line as `<name> (<code>)` |
| WD-007, AP-003 | `Approve 6h 45m` | `Approve 6h:45m`; Spent Hours reads `1h:45m` / `00h:00m` |
| WD-010 (CL-14) | Order to confirm | Newest request first; decided requests leave the drawer (WD-009) |
| AD-001, AD-005 | Adjust button `Approve Xh Ym`, optional note | **Approve Hours**; note is **Remarks\*** (`Note For The Operator`) |
| AD-013 (CL-20) | Note optional or mandatory? | **Mandatory**: Approve Hours stays disabled until Remarks\* is filled |
| AD-010, AD-011 | `The job end must be after the job start.` | `The Job End Must Be After The Job Start` |
| AD-008 (CL-19) | Blocked, message to confirm | **Not blocked**: Approve Hours stays enabled and the server saves no machine (#43) |
| RJ-002, RJ-003 (CL-19) | A validation message | Confirm Reject disabled while empty; a spaces-only reason shows `Reason Is Required` on Confirm (API: `Add a reason for rejecting this request.`) |
| RJ-001, RJ-005 (CL-21) | `The app's 5h 36m stays as the spent hours.` | `Logged Hours Stay As The Spent Hours` (same for new entries) |
| OV-001 | Table `Work Order · Plot · Machine · Time` | `Work Order · Plot · Machine · Start Date · End Date`; the operator's own entry is listed as a row too |
| OV-004 (CL-02) | Redistribute, algorithm to confirm | The overlapped entry is **removed whole**, including its non-overlapping part (#44) |
| OV-006 | No prompt for a different machine | Prompt shown: the operator's own entry counts (#45) |
| UI-006 | Error message, retry possible | The Create Adjustment prompt opens (empty) instead; retry still works (#46) |
| RL-008 | Actions not available | The operator is sent from the WO detail back to `/workorders` |
| RL-010 – RL-012 | Hidden/disabled or error | API `PUT …/Decide` by the raiser returns **401** |
| WC-001 | "message stating pending hour log adjustment requests" | Header button **Mark As Done** (not `Work Order Completed`) → dialog **Approve This Work Order** → **Approve** → alert `This work order has a pending hour-log change request. Decide it before completing or posting this work order.` |
| WR-011 | "Log shows the updated entry" | **Hours Logged** opens a **Spent Hours** drawer: Job ID `LogAdj-nnnn`, Start/End Date & Time, Hours, Approval Status |
