# Hour Log Adjustment — Hour Log Change Requests

Source: `resources/product-specifications-document/AgriERP FSCM - Hour Log Adjustment.pdf`
(PSD v1.0, Aug 17 2026, 25 pages). Deployed to QA as of 2026-09-28; tenant **Feature Set** has
`Module | Hour Log Adjustment | Enabled`. The **web** section below is **verified live
2026-09-28** (WO-1283) and wins over the PSD mocks where they differ — see "Live vs PSD". The
**mobile** section is still from the PSD only (not verifiable from web/Playwright).

## What it is

A request-and-approval flow for correcting the hours a **Machine Operator**'s mobile app recorded
against a work order. The operator **raises** a request on **mobile**; the **Farm Manager**
(Admin/Manager role) **decides** it on **web** — **Approve**, **Adjust** or **Reject**. Nothing
touches the hour log until a manager decides. Decided hours update the resource's hour log,
the **Spent Hours** on the web Resources table, and the operator's mobile hour log; every decision
writes an audit log entry. Approved spent hours per resource are posted to D365 F&O for labour
costing against the work order, task and field.

Two request kinds:
- **Change** to an existing entry (mobile **edit** action → **Request Hour Change**).
- **New entry** for a run the app never recorded (mobile **Add New Request**). On web it shows
  **Not logged** in the "logged by app" column.

## Feature toggle & access

- Controlled by the tenant **Feature Set** (`GET /api/FeatureSet`). When disabled, **Add New
  Request**, **Edit**, **Approve**, **Adjust** and **Reject** are all unavailable.
- Mobile **Hour Log Adjustment** tab is **not visible** to **Supervisor**, **Admin** and **Manager**
  roles — it is for Machine Operators (field staff, permission-based).
- **Raising requests needs a role permission:** Work Orders module (`3`) privilege **`23`**, as
  returned by `GET /api/User/rolePermissions`. Without it, *every* `HourLogChangeRequests`
  endpoint returns **401** for that user, including listing their own requests (`…/Mine`), while
  other endpoints still work. Seen 2026-09-28 when agrierp07's role briefly lost it (`[1,18,19,20]`
  → `[1,18,19,20,23]` once restored). A 401 there means check the role, not the token.
- **Self-approval restriction:** a user cannot approve/adjust/reject their own request. Deciding
  is a separate permission from raising.

## Mobile — Hour Log Adjustment tab (Machine Operator)

A tab on the work order. Top: approved hours and number of entries. Entries grouped **by field**
with count and total per field. Each entry shows only **date, start time, end time, duration**,
with an **edit** and a **delete** action.

**Add New Request** / **Request Hour Change** sheet fields:

| Field | Rule |
|---|---|
| Field | Required. Lists **only the fields on that work order**. |
| Job start (date + time) | Required. |
| Job end (date + time) | Required. Must be **after** job start. |
| Machine | Required, **multi-select** dropdown with checkboxes (stays open for several picks; shows `N selected`). At least one. |
| Implement | **Optional**, multi-select, searchable. |
| Duration | **Read-only**, system-calculated from start/end. |
| Reason | Required. |

On **Request Hour Change** the app-logged hours are shown at the top for reference and the
entry's machines/implements are pre-selected. The sheet states the request goes to the manager
for approval.

Availability: a request can only be raised while the WO is **In Progress**; once it moves to
**Review** no new request can be raised. Works **offline** (validations run before offline save;
syncs on reconnect).

### Validation messages (verbatim from spec)

| Rule | Message |
|---|---|
| Field missing | `Select a field.` |
| Start missing | `Enter the start date and time.` |
| End missing | `Enter the end date and time.` |
| No machine | `Select at least one machine.` |
| End ≤ start (shown under Job end as soon as inconsistent, and blocks submit) | `The job end must be after the job start.` |
| Reason missing | `Add a short reason — your manager needs it to approve.` |

End-after-start also applies to the manager's adjusted hours on web.
**Overnight:** a run past midnight is split into two entries — up to 11:59 PM and from 12:00 AM.
The operator is **never** shown the overlap prompt.

## Web — reviewing requests (Farm Manager) — verified live 2026-09-28

Navigation: **Work Orders** → open the WO (`/workorders/<id>`) → **Resources** table.

- Resources table columns: `Resource Name` · `Resource Type` · `No Of Resource` · `Company` ·
  `Tracking Log` (`View`) · `Progress` (`Area Completed`) · `Spent Hours` (e.g. `10h:01m` +
  `Hours Logged` link) · **`Hour Log Changes`**. Rows grouped by `Resource Group Name: …`.
- Pending requests show a badge link **`N To Review`** (capital R; title attr
  `Hour Log Change Request`). It appears on **Machine** resource rows too, not only operators.
  The chips load from a separate fetch *after* the table renders.
- **Spent Hours** shows currently approved hours (format `NNh:MMm`).

### Hour Log Change Requests drawer (right-side `app-aside`)

- Heading **Hour Log Change Requests** / **Hour Log Change Request**: it has flipped between the
  two across redeploys (plural 2026-09-28 afternoon, singular again 2026-09-29), so match both. Subtitle `Agrierp 07 (07) · WO-1283 · 2 Needs Review` (the `·`
  separators are CSS, not text). **Close** (×) top-right.
- Card: **`REQ-0151`** + device badge **`IOS`** (icon + text); `320 (PRJ_000067) · 09/09/2026`
  (field code, project, date — no `Job Log-nnnn`, no "N days ago / by <name>" on live);
  `Machine: <name> (<code>)`; a **Requested** panel (`06:01 PM - 10:46 PM`, `4h:45m`) — for
  new-entry requests only this panel shows (no "Logged by app" / "Change" panels observed yet);
  the operator's reason; buttons **`Approve 4h:45m`** (green) · **`Adjust`** (blue) · **`Reject`** (red).
  A request on two machines lists each as its own `<name> (<code>)` line.
- Cards are ordered **newest request first**. A decided request leaves the drawer, and the subtitle
  count drops.
- Times display in the browser's local time zone (API returns UTC, e.g. `13:01Z` → `06:01 PM` PKT).

**Adjust** → heading **Set The Hours Yourself**: **Machine** (selected assets as `× ` chips) and
**Implement** (`Select Implement`) multi-selects; **Job Start\*** / **Job End\*** (date +
`HH`/`MM` textboxes + `AM`/`PM` toggle); **Remarks\*** textbox placeholder **Note For The
Operator** — **mandatory** (PSD calls it an optional note); **Approve Hours** (disabled until
Remarks is filled; no duration on this button, unlike the mock) · **Cancel**.
End ≤ start → **`The Job End Must Be After The Job Start`** and **Approve Hours** disables.
The form opens pre-filled with the request's machines and times, and has **no Field selector** and
no duration field. Machine options are the WO's machine assets (ng-multiselect with `Select All` and
`Search`); adding one keeps the others. **Unticking every machine leaves Approve Hours enabled, and
the server saves the entry with no machine** (FINDINGS #43).

**Reject** → heading **Reject This Change**, text **Logged Hours Stay As The Spent Hours**,
textbox **Reason Shown To The Operator**, **Confirm Reject** (disabled until a reason) · **Cancel**.
A spaces-only reason enables the button, but Confirm then shows **`Reason Is Required`** and
disables it (API: 400 `Add a reason for rejecting this request.`).

**Resources table after decisions:** Spent Hours (`00h:00m`, `1h:45m`) counts approved/adjusted
hours only and updates without a reload. A resource with no pending request shows `—` in **Hour Log
Changes**. The row's **Hours Logged** link opens a **Spent Hours** drawer (`Create` button, one block
per entry: `Plot`, `Job ID` `LogAdj-nnnn`, `Start Date & Time` / `End Date & Time`
`MM/DD/YYYY hh:mm AM`, `Hours`, `Hour Log Status`, `Approval Status`, `Comments` = the request's
reason or the manager's note).

**Who can decide:** a Farm Hand operator (Agrierp 07) opening `/workorders/<id>` is sent back to
`/workorders`, and their `PUT …/Decide` answers 401.

### Live vs PSD (drift to know)

| PSD mock | Live QA 2026-09-28 |
|---|---|
| chip `2 to review` | `2 To Review` |
| `REQ-0007 … 2 needs review` | `N Needs Review`; request numbers already at `REQ-015x` |
| `Field 342 · Job Log-0002 · Jul 26`, `13 days ago / by …` | `320 (PRJ_000067) · 09/09/2026`; no age/raiser shown |
| LOGGED BY APP / REQUESTED / CHANGE panels | only `Requested` seen (new-entry requests) |
| durations `6h 45m`, `Approve 6h 45m` | `4h:45m`, `Approve 4h:45m` |
| Adjust: `Set the hours yourself`, optional note, `Approve 6h 30m` | `Set The Hours Yourself`, **Remarks\*** required, `Approve Hours` |
| Reject: `Reject this change`, `The app's 5h 36m stays…`, `Confirm reject` | `Reject This Change`, `Logged Hours Stay As The Spent Hours`, `Confirm Reject` |
| Web end-after-start: `The job end must be after the job start.` | `The Job End Must Be After The Job Start` |

Data observations (API, WO-1283): `REQ-0147` has **no machine** although the PSD requires at
least one; overnight requests (e.g. `20:03 → 01:04`) are stored as a single request — the split
at midnight applies to the hour log, not the request.

### Create Adjustment prompt (overlap — web only) — verified live 2026-09-29

Approve/Adjust calls `PUT …/Decide` with `confirmOverride: false`. When the decided time
intersects an approved entry of the **same resource**, the server answers **409** (body `message`
plus `overlaps[]`) and the web opens the modal **Create Adjustment**:

> The Selected Time Overlaps with Existing Job Time For The Same Resource And Machine

Table (**Existing Overlapping Entries**): `Work Order` · `Plot` · `Machine` · `Start Date` ·
`End Date`, e.g. `QA HLA …` · `Test_Field` · `2002 CAT 962G LOADER TRACTOR (K46)` ·
`09/28/2026 01:00 PM` · `09/28/2026 02:00 PM`. The operator's own entry is listed too (its name
shows in the `Machine` column).

> If You Continue The System Will Redistribute Hours For All Impacted Overlapping Entries Do You Want To Continue

Buttons **Cancel** (nothing decided, no audit entry) / **Continue** (re-sends Decide with
`confirmOverride: true`).

Observed behaviour (live differs from the PSD):
- **Continue** removes the overlapped entry **whole** for the operator and the machine, not just the
  overlapping minutes. `HourAdjustmentsHistory` records the removed entry, and the decision's
  HistoryLog payload has `OverrideConfirmed: true` (FINDINGS #44, CL-02).
- The prompt also appears when only the **operator** overlaps and the machine differs (FINDINGS #45).
  Touching times (end = next start) do not prompt; a one-minute overlap does. Pending requests are
  not treated as entries. Reject never prompts.
- The web opens this prompt (with an empty table) for **any** failed Decide call, including a
  network failure or a 400 `…cannot be overridden…` (FINDINGS #46).

## Business rules

- **Per-resource:** a decision changes only the requesting resource's hour log — never another resource's.
- **WO completion gate:** a WO cannot be completed while any request is still pending.
- **Final times:** approve → requested; adjust → manager's; reject → original.
- **Notification:** raising a request notifies the manager with WO, Field, Resource, requested hours, reason.
- **Audit log** on every approve/adjust/reject (immutable): original/requested/decided hours,
  assets, reasons, manager note, rejection reason, redistribution applied, decided by/at.
- Request **Status**: `Needs review`, `Approved`, `Adjusted`, `Rejected`.

## API (QA backend, `WorkOrder` tag — see `vannbrosphasetwo-vann-api-qa`)

| Action | Endpoint |
|---|---|
| Raise (operator) | `POST /api/WorkOrder/HourLogChangeRequests` — `workOrderId`, `workOrderLineId?`, `fieldId`, `requestedStartDateTime`, `requestedEndDateTime`, `resourceId`, `machineResourceIds[]`, `implementResourceIds[]`, `reason`, `mobileDeviceType` (1 iOS, 2 Android) |
| Edit / delete own pending request | `PUT` / `DELETE /api/WorkOrder/HourLogChangeRequests/{requestId}` |
| List per WO | `GET /api/WorkOrder/{id}/HourLogChangeRequests?resourceId=&approvalStatus=` |
| Pending counts (the "to review" chip) | `GET /api/WorkOrder/{id}/HourLogChangeRequests/PendingByResource` |
| Operator's own | `GET /api/WorkOrder/{id}/HourLogChangeRequests/Mine` |
| Overlapping entries | `GET /api/WorkOrder/HourLogChangeRequests/{requestId}/ExistingHourLogs` |
| Decide | `PUT /api/WorkOrder/HourLogChangeRequests/{requestId}/Decide` — `outcome` (`ApprovalStatus`: 1 Unapproved, 2 Approved, 3 Rejected, 4 Adjusted), `adjustedStart/EndDateTime`, `machineResourceIds`, `implementResourceIds`, `approverRemarks` (manager note), `rejectionReason`, `confirmOverride` (= Continue on the overlap prompt) |
| Audit / history | `GET /api/WorkOrder/HourAdjustmentsHistory?WorkOrderId=&ResourceId=` |

## QA findings & API behaviour (verified 2026-09-28)

Seeding and automation: WOs only ever move **forward** (To Do → In Progress → Review). Never
send a started WO back to To Do or delete it, even though the API allows it (#1).
`pnpm seed:hourlog` (`playwright/api/hour-log-requests.mts`) and the
`@mutating` `hour-log-decisions.spec.ts`. They need two actors: admin (`Crop Planner`) and operator
`f3-agrierp-07` (resource **Agrierp 07**, id 609). The operator's token goes in
`playwright/.auth/qa_operator_token.txt`.

| # | Behaviour | Verdict |
|---|---|---|
| 1 | The API lets a started WO go **back** to To Do (`POST WorkOrder/Status {statusID: 2}`) and then be deleted, even with decided hours. It also allows Review → In Progress. The product flow is forward-only; an approved or started WO cannot return to To Do. The deleted WO's decided `LogAdj-nnnn` hours survive and block later decisions over that time (400 `…cannot be overridden by this decision…`). Found because our first teardown used this path; the tests no longer do. FINDINGS #36. | **Defect** (API does not enforce the lifecycle). |
| 2 | `POST HourLogChangeRequests` with `machineResourceIds: []` is **accepted**; `REQ-0147` on WO-1283 is a real example. The PSD requires at least one machine. | **Defect** (server-side validation missing). |
| 3 | Scripted `PUT …/Decide` with `{outcome: 2}` (Approve) returns an **empty 500**, even with the exact body the web app sends (`adjustedStart/EndDateTime` included). The same Approve from the web UI succeeds, and a scripted **Reject** (`outcome: 3`) works. The cause is unknown; it may depend on a header the app adds. The specs therefore decide through the UI. | **Open.** Needs a backend look. 2026-09-29: scripted Decide (admin token) approved normally, so this looks resolved. |
| 4 | Server validation messages match the PSD verbatim: `The job end must be after the job start.` and `Add a short reason — your manager needs it to approve.` | As specified. |
| 5 | The raiser calling `Decide` on their own request gets **401**. | Self-approval restriction holds. |
| 6 | `PendingByResource` counts requests against every **machine** in the request too, so machine rows also show `N To Review`. | Not in the PSD; confirm intent. |
| 7 | The operator's `PUT WorkOrder/WorkOrderStart` gets 401. The admin's `POST WorkOrder/Status {statusID: 3}` starts a WO, and `{statusID: 4}` moves it on to Review. Deleting is only allowed in Queue/Draft/To Do, so a seeded WO is never deleted once started. Each test run leaves one `QA HLA <timestamp>` WO in **Review**. | Test-setup path (forward-only). |
| 8 | The operator's `POST WorkOrder/HourLogs` intermittently returns 500 (`Invalid response received from cloud function…`), and stores server-chosen times when it succeeds. | Flaky on QA. |
| 9 | Scripted decisions on requests dated weeks back also returned an empty 500. This is probably the same issue as #3, not a date rule. | Open (see #3). |
| 10 | Overnight request `21:00 → 00:00` was stored as `21:00 – 23:59` (`LogAdj`), which matches the midnight split rule. | As specified. |
| 11 | Completion gate: `POST WorkOrder/Status {statusID: 5}` with a pending request returns **400** `This work order has a pending hour-log change request. Decide it before completing or posting this work order.` | As specified (B16). |
| 12 | Raising a request while the WO is in **Review** returns **400** `This job can only be adjusted while the work order is In Progress.` | As specified (A15). |
| 13 | **Audit trail** is `GET /api/HistoryLog?EntityID=<requestId>`. `HourAdjustmentsHistory?WorkOrderId=&ResourceId=` lists only entries removed by an overlap Continue (0 rows otherwise). Each request gets `HourLogChangeRequestRaised` (platform Mobile) and `HourLogChangeRequestApproved` / `…Adjusted` / `…Rejected` (platform Web). The `eventPayload` holds the request number, times, reason, status and decider. It is also in `EventTrail` (entity `WorkOrderHourLogChangeRequest`). | As specified (C03). |
| 14 | `GET /api/WorkOrder/HourLogs` answers 400 `Model state is invalid!` unless it gets `WorkOrderId`, `WorkOrderLineId` **and** `ResourceId`. A decided request writes a `LogAdj-nnnn` entry (`schemeName: Adjustment`) for the operator and one per machine. (verified 2026-09-29) | Read path for tests. |
| 15 | `HourLogChangeRequestCreateAPIModel` has no field for the entry being changed, so every request raised through the API is a **new entry**. The LOGGED BY APP / CHANGE panels cannot be produced from a script. (2026-09-29) | Limits B03 / WD-003. |
| 16 | A decision on an already-decided request is refused, and a double-click on Approve decides once (one audit event). Adjust with **no machine** is accepted (FINDINGS #43). (2026-09-29) | #43 is a defect. |
