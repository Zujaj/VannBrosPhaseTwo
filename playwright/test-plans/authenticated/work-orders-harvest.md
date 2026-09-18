# Test Plan — Harvest Work Orders

> One of four WO-type plans. Siblings: [`work-orders-planned.md`](./work-orders-planned.md),
> [`work-orders-tank-mix.md`](./work-orders-tank-mix.md),
> [`work-orders-inspection.md`](./work-orders-inspection.md).
> Shared form mechanics live in `tests/pages/work-orders.page.ts` (via the `workOrdersPage`
> fixture in `tests/fixtures.ts`).

- **Spec:** `playwright/tests/authenticated/work-orders-harvest.spec.ts`
- **Automation status:** **Automated & passing (verified live 2026-08-27 via a full `pnpm test`
  run: 18 passed, 0 failed, all five harvest tests green on their first attempt).** Five cases:
  - **WO-HARV-003 (TC-3)** — sub-tab opens the Create form; Plot/Resources/Assets present,
    Materials section and Enable Tank Mixing absent. Non-mutating.
  - **WO-HARV-002 (TC-2)** — Task\* offers all five harvest operations and **not**
    `Fertilization (1240)`. Non-mutating.
  - **WO-HARV-004 (TC-4)** — Task Type\* disabled, Supervisor\* enabled. Non-mutating.
  - **WO-HARV-005 (TC-5)** — Save As / Submit disabled on a fresh form and after name-only.
    Non-mutating.
  - **WO-HARV-001 (TC-1)** — happy path, tagged `@mutating` (creates a real harvest WO each
    run). Excluded from clean-env runs with `--grep-invert @mutating`.

  Remaining cases (TC-6 ... TC-22) are **manual**.

  **Two failure modes cost a full debug cycle here — don't reintroduce them:**
  - **`Select Plot` vs `Select Block`.** Under parallel load the shared QA env intermittently
    serves an older variant of that section labelled `Select Block`. Asserting only the current
    label passes when this file runs alone and fails inside a full `pnpm test`. Match both
    (`/^Select (Plot|Block)s?$/`), as `addFirstFromModal` already does elsewhere. The same
    applies to the *negative* materials assertion: an exact-name `toHaveCount(0)` silently
    **passes** against a renamed section, which is a false pass on the very claim being made.
  - **Budget.** The sub-tab hop is an extra list fetch behind the truck loader, so this file and
    `work-orders-inspection.spec.ts` both set `test.describe.configure({ timeout: 90_000 })`.
    Sizing a single wait at the whole 30s default just converts a slow render into an
    uninformative "Test timeout exceeded" with nothing left for the steps after it.

  If the session stops authenticating (`/workorders` → 200 → SPA guard redirect to `/login`),
  regenerate it with `pnpm auth:qa` (interactive Microsoft login) — the stored Season has its
  own shorter TTL and can expire independently of the token.
- **Source of truth:** `vannbrosphasetwo-knowledge/work-orders-harvest.md` + **live QA verification 2026-08-27**
  (`agrierp-vann-qa.folio3.site`, Site `Colusa`, Season `Crop Year 2026`).
  ⚠️ There is **no vendor manual** for this flow in `resources/user-manuals/` — unlike the
  planned / tank-mix / inspection flows, every fact below is live-observed. The knowledge
  reference was written from this same pass, so the two are not independent confirmations.
- **Last updated:** 2026-08-27

**Scope:** Web authoring, listing, and approval of Harvest work orders via the
**Work Orders → Harvest Work Orders** sub-tab, plus the adjacent **Harvest Central**
harvest-ticket screen. Field execution (progress, harvest quantity capture) happens on
**mobile** and is a precondition, not a step, for the approval cases.

---

## Verified live 2026-08-27

Facts every case below depends on — all read off the running QA app:

- **`Harvest Work Orders` is a live sub-tab**, third of four: `Work Orders` |
  `Inspection Work Orders` | **`Harvest Work Orders`** | `Point Of Interests`. Each is a
  `button.btn.btn-outline-primary.btn-sm`, not a link or an ARIA tab, and its text is its
  accessible name — `getByRole('button', { name: 'Harvest Work Orders', exact: true })`
  matches exactly 1 (same locator style the inspection spec already uses). Prefer it over
  `getByText`, which resolves 4 nodes for the `Work Orders` tab. The tabs mount late; wait
  for the list to render before clicking.
- **The list is the standard WO list**: status chips `All | Queue | Draft | To Do | In Progress
  | Review | Done | Filter`; columns `WO Sequence No.`, `WO Name`, `Priority`, `WO Start Date`,
  `WO End Date`, `Farm`, `Plots`, `Progress`, `Operation`, `Materials`, `Status`, `Submitted By`,
  `Responsible`, `Actions`. 28 records at capture time (main `Work Orders` tab held 823).
- **Row actions** (note the wording drift vs. the main tab): `Clone Work Order`,
  `View Work Order Detail`, `Edit Work Order`, **`Delete Workorder`** — "Workorder" as one
  word here, where the main Work Orders tab uses `Delete Work Order`.
- **Create is the shared `Create New Work Orders` button** (top-right); it opens
  **`Create New Work Order`** with the green **`Planned`** chip — same header as the Planned flow.
- **`Task Type*` is pre-set to `Planned` and DISABLED** on this form (like the Inspection form).
  Unlike Inspection, **`Supervisor*` and `Responsible` remain ENABLED** and Supervisor is required.
- **`Task*` is scoped to the five harvest operations only** — this is what actually makes the
  form a "Harvest" WO:
  | Task | Code |
  |---|---|
  | `Harvest` | 1610 |
  | `Hulling & Drying` | 1620 |
  | `Shaking` | 1630 |
  | `Conditioning` | 1640 |
  | `Pickup` | 1650 |
- **No `Select Materials` section and no `Enable Tank Mixing` toggle** on the harvest create
  form. Sections are **`Select Plot` → `Select Resources` → `Select Assets`** only, and the
  right-hand **Summary** panel shows `General` / `Plots` / `Resources` (no `Materials`).
- **`Select Resources` offers a `By Resource` / `By Groups` radio pair**; add triggers are
  `button[title="Add Plot"]`, `button[title="Add Plot using map"]`, `button[title="Add Resources"]`,
  `button[title="Add Asset"]`.
- **`Select Plots` modal** columns: `Select`, `Crop`, `Plot`, `Customer Name`, `Plot Area`,
  `Operational Area`, `Task Start Date`, `Task End Date`; header shows `N Plots Selected` and
  `0.00 ac Total selected plot area`; footer `99 Total Records`.
- **Detail view carries two harvest-only columns** not present on Planned/Inspection details:
  **`Target Quantity`** (Plots grid) and **`Harvest Quantity`** + `Asset Usage UOM` (Assets grid).
  Detail also renders `Additional Information`, `Plot Details`, **`Weather`**, and `Plots Map`.
- **The completion button on the detail header reads `Workorder Completed`** (one word) — the
  knowledge base records `Work Order Completed` for the Planned flow. Do not hard-code the
  Planned spelling here.
- **`Approver Comments`** is the detail field label (knowledge base records `Approve Comments`
  for Planned).
- **Harvest Central is a separate top-nav item** (`/harvest-central`), not a WO sub-tab. It lists
  harvest **tickets** aggregated per field: `Field`, `Variety`, `No Of Harvest Tickets`,
  `Updated By`, `Updated By Date`, `Action`, with a `Create Harvest Ticket` button and a
  `Refresh Data` button.
- **Carry-overs from the Planned flow** (same gotchas apply, `vannbrosphasetwo-knowledge/work-orders.md`):
  the `Select Range` / `Task Date Range` picker beside the plot `+` is a **broken, non-required**
  date-range filter (min/max stuck at 1900-01-01) — never touch it; the full-screen truck loader
  (`#f3-overlay-loader`) intercepts clicks during fetches; and **Supervisor gets wiped by form
  re-renders — select it last, just before Submit.**

---

## TC-1 — Happy path: create + submit a Harvest work order

| Field | Content |
|---|---|
| **ID** | WO-HARV-001 |
| **Title** | Create and submit a Harvest work order (plot + resources + assets) |
| **Module** | Work Orders |
| **Role** | Manager |
| **Platform** | Web |
| **Priority** | P1 |
| **Preconditions** | Logged in; Site `Colusa` / Season `Crop Year 2026` selected; ≥1 Farm with plots; harvesting enabled for the tenant |
| **Steps** | 1. **Work Orders** → **Harvest Work Orders** sub-tab. 2. Click **Create New Work Orders**. 3. Enter **Work Order Name\***; leave/adjust **WO Start Date\*** / **WO End Date\***; set **Priority\***. 4. Select **Farm\***. 5. Select **Task\*** = a harvest operation. 6. **Select Plot** → `+ (Add Plot)` → tick plot(s) → **Save**. 7. **Select Resources** → `By Resource` → `+ (Add Resources)` → pick → **Save**. 8. **Select Assets** → `+ (Add Asset)` → pick → **Save**. 9. Select **Supervisor\*** **last**. 10. **Submit** → confirm dialog → **Save**. |
| **Test data** | Name `Harvest QA <date>-1`; Priority `Medium`; Farm `Vann Farm (VBSF)`; Task `Harvest (1610)`; Plot `330 (PRJ_000077)`; Supervisor any active resource |
| **Expected result** | Toast `Work Order WO-XXXXX \| <name> Saved Successfully`; a new row appears **on the Harvest Work Orders tab** with status **To Do / Queue**, `Operation` = `Harvest`, and the selected plot(s) in `Plots`. **No** Materials or Tank Mixing sections were shown at any point. |
| **Type** | Smoke / Functional |

---

## TC-2 — `Task*` offers only harvest operations

| Field | Content |
|---|---|
| **ID** | WO-HARV-002 |
| **Title** | Harvest create form scopes the Task dropdown to the five harvest operations |
| **Module** | Work Orders |
| **Role** | Manager |
| **Platform** | Web |
| **Priority** | P1 |
| **Preconditions** | Logged in; on the **Harvest Work Orders** sub-tab |
| **Steps** | 1. Click **Create New Work Orders**. 2. Open the **Task\*** dropdown. 3. Read every option. |
| **Test data** | — |
| **Expected result** | Exactly five options, no others: `Conditioning (1640)`, `Harvest (1610)`, `Hulling & Drying (1620)`, `Pickup (1650)`, `Shaking (1630)`. Non-harvest operations (`Irrigation (1410)`, `Fertilization (1240)`, `Sampling (1510)`, …) are **absent**. |
| **Type** | Functional / Regression |

---

## TC-3 — Harvest create form hides Materials and Tank Mixing

| Field | Content |
|---|---|
| **ID** | WO-HARV-003 |
| **Title** | Harvest WO form exposes Plot / Resources / Assets only — no Materials, no Tank Mixing |
| **Module** | Work Orders |
| **Role** | Manager |
| **Platform** | Web |
| **Priority** | P1 |
| **Preconditions** | Logged in; on the **Harvest Work Orders** sub-tab |
| **Steps** | 1. Click **Create New Work Orders**. 2. Scroll the whole form. 3. Inspect the right-hand **Summary** panel. |
| **Test data** | — |
| **Expected result** | Sections present: **`Select Plot`**, **`Select Resources`**, **`Select Assets`**. Section **`Select Materials` is absent**, and the **`Enable Tank Mixing`** toggle is **absent**. Summary lists `General`, `Plots`, `Resources` — no `Materials`, no `Tank Mixing`. Header shows `Create New Work Order` + green `Planned` chip. |
| **Type** | Functional / Regression |

---

## TC-4 — `Task Type*` is locked to `Planned`

| Field | Content |
|---|---|
| **ID** | WO-HARV-004 |
| **Title** | Task Type is pre-set to Planned and not editable on the Harvest form |
| **Module** | Work Orders |
| **Role** | Manager |
| **Platform** | Web |
| **Priority** | P2 |
| **Preconditions** | Logged in; on the **Harvest Work Orders** sub-tab |
| **Steps** | 1. Click **Create New Work Orders**. 2. Attempt to open the **Task Type\*** dropdown. 3. Check **Supervisor\*** and **Responsible**. |
| **Test data** | — |
| **Expected result** | **`Task Type*`** shows `Planned` and its toggle is **disabled** — clicking opens no panel. **`Supervisor*` and `Responsible` are enabled** (contrast with the Inspection form, where all three are disabled). |
| **Type** | Functional |

---

## TC-5 — Submit / Save As blocked until required fields are filled

| Field | Content |
|---|---|
| **ID** | WO-HARV-005 |
| **Title** | Harvest WO cannot be submitted with required fields empty |
| **Module** | Work Orders |
| **Role** | Manager |
| **Platform** | Web |
| **Priority** | P1 |
| **Preconditions** | Logged in; on the **Harvest Work Orders** sub-tab |
| **Steps** | 1. Click **Create New Work Orders**. 2. Observe **Save As** and **Submit** on a fresh form. 3. Fill **Work Order Name\*** only; re-check. 4. Fill **Farm\***, **Task\***, **Supervisor\***, add ≥1 plot; re-check. |
| **Test data** | Name `Harvest Validation <date>` |
| **Expected result** | On a fresh form both **`Save As` and `Submit` are disabled**. They stay disabled while any `*` field (`Work Order Name`, `WO Start Date`, `WO End Date`, `Priority`, `Farm`, `Task`, `Supervisor`) is empty, and enable only once all are satisfied. |
| **Type** | Negative / Functional |

---

## TC-6 — Plot/Resource/Asset `+` buttons are inert before Farm + Task

| Field | Content |
|---|---|
| **ID** | WO-HARV-006 |
| **Title** | Selection modals stay closed until their prerequisites are set |
| **Module** | Work Orders |
| **Role** | Manager |
| **Platform** | Web |
| **Priority** | P2 |
| **Preconditions** | Logged in; a fresh Harvest create form |
| **Steps** | 1. On the untouched form click `+` (`Add Plot`), then `+` (`Add Resources`), then `+` (`Add Asset`). 2. Select **Farm\*** and **Task\***; click `+` (`Add Plot`). 3. Add a plot and **Save**; click `+` (`Add Resources`) and `+` (`Add Asset`). |
| **Test data** | Farm `Vann Farm (VBSF)`; Task `Shaking (1630)` |
| **Expected result** | Step 1 opens **no** modal. After Farm + Task, `Add Plot` opens the **`Select Plots`** modal. `Add Resources` / `Add Asset` open their modals only **after a plot is saved**; empty states read `No resource found` / `No assets found`. |
| **Type** | Negative / Functional |

---

## TC-7 — Select Plots modal contents and running total

| Field | Content |
|---|---|
| **ID** | WO-HARV-007 |
| **Title** | Plot picker lists plots with area columns and tracks the selected-area total |
| **Module** | Work Orders |
| **Role** | Manager |
| **Platform** | Web |
| **Priority** | P2 |
| **Preconditions** | Harvest create form with **Farm\*** and **Task\*** set |
| **Steps** | 1. Click `+` (`Add Plot`). 2. Read the modal heading, columns, and counters. 3. Search for a plot. 4. Tick two plots. 5. Click **Save**. |
| **Test data** | Plots `330 (PRJ_000077)` (132.50 ac) and `331 (PRJ_000078)` (297.79 ac) |
| **Expected result** | Heading **`Select Plots`**; columns `Select`, `Crop`, `Plot`, `Customer Name`, `Plot Area`, `Operational Area`, `Task Start Date`, `Task End Date`; footer `99 Total Records`. Counter moves `0 Plots Selected` → `2 Plots Selected` and `Total selected plot area` sums the two plots' area. After **Save** both plots appear in the form's **Select Plot** grid and `0 Total Plots` updates to `2 Total Plots`. |
| **Type** | Functional |

---

## TC-8 — Assign resources by group

| Field | Content |
|---|---|
| **ID** | WO-HARV-008 |
| **Title** | Harvest WO resources can be assigned By Resource or By Groups |
| **Module** | Work Orders |
| **Role** | Manager |
| **Platform** | Web |
| **Priority** | P2 |
| **Preconditions** | Harvest create form with Farm, Task, and ≥1 plot set |
| **Steps** | 1. In **Select Resources**, select the **`By Groups`** radio. 2. Click `+` (`Add Resources`). 3. Pick a resource group → **Save**. 4. Switch to the **`By Resource`** radio and repeat with an individual resource. |
| **Test data** | Resource group `Machine Operator`; resource `Agrierp 10 (10)` |
| **Expected result** | The resources grid fills with `Resource Name`, `Resource Type`, `Company Name`, `No Of Resource`, `Action`, grouped under `Resource Group Name: <group>`. The Summary panel's `Resources` count increases. |
| **Type** | Functional |

---

## TC-9 — Save a Harvest work order as Draft

| Field | Content |
|---|---|
| **ID** | WO-HARV-009 |
| **Title** | Save As Draft creates a Harvest WO in Draft with no Submitted By |
| **Module** | Work Orders |
| **Role** | Manager |
| **Platform** | Web |
| **Priority** | P2 |
| **Preconditions** | Harvest create form with all `*` fields filled |
| **Steps** | 1. Fill the form per TC-1 steps 3–9. 2. Click **Save As** → choose the draft option. 3. Return to the **Harvest Work Orders** tab. 4. Click the **Draft** status chip. |
| **Test data** | Name `Harvest Draft <date>`; Task `Pickup (1650)` |
| **Expected result** | The WO is listed under the **Draft** chip with status **`Draft`**, an empty **`Submitted By`** cell, and `0% Completed` progress. It does **not** appear under **To Do** or **Queue**, and is not visible to mobile. |
| **Type** | Functional |

---

## TC-10 — Status filter chips scope the harvest list

| Field | Content |
|---|---|
| **ID** | WO-HARV-010 |
| **Title** | Harvest list status chips filter to matching harvest WOs only |
| **Module** | Work Orders |
| **Role** | Manager |
| **Platform** | Web |
| **Priority** | P2 |
| **Preconditions** | Harvest WOs exist in more than one status |
| **Steps** | 1. On the **Harvest Work Orders** tab note the **All** record count. 2. Click each chip in turn: **Queue**, **Draft**, **To Do**, **In Progress**, **Review**, **Done**. 3. Return to **All**. |
| **Test data** | — |
| **Expected result** | Each chip narrows the grid to rows whose **`Status`** equals the chip, the footer count (`Showing 1 - N of N records`) updates accordingly, and every row still carries a harvest `Operation` (`Harvest` / `Hulling & Drying` / `Shaking` / `Conditioning` / `Pickup`). **All** restores the full harvest count (28 at 2026-08-27 capture). |
| **Type** | Functional / Regression |

---

## TC-11 — Harvest WOs are scoped to the Harvest tab

| Field | Content |
|---|---|
| **ID** | WO-HARV-011 |
| **Title** | A Harvest WO is listed under Harvest Work Orders and not under the Work Orders tab |
| **Module** | Work Orders |
| **Role** | Manager |
| **Platform** | Web |
| **Priority** | P1 |
| **Preconditions** | The WO created in TC-1 exists |
| **Steps** | 1. On the **Harvest Work Orders** tab, note the new WO's **WO Sequence No.**. 2. Switch to the **Work Orders** tab. 3. Use the `WO Sequence No.` column filter (`Search by column filter`) to search that sequence number. 4. Repeat the search on the **Harvest Work Orders** tab. |
| **Test data** | The `WO-XXXXX` from TC-1 |
| **Expected result** | The main **Work Orders** tab returns **no match** for the harvest sequence number; the **Harvest Work Orders** tab returns exactly one row. The two lists are disjoint by operation type. |
| **Type** | Functional / Regression |
| **Note** | Spot-checked on page 1 of the main list at capture time (`WO-1070`, `WO-1069`, `WO-1067`, `WO-1015` all absent from the 823-record main tab's first page) — the column-filter search above is what makes the assertion conclusive across all pages. |

---

## TC-12 — Detail view exposes the harvest-only quantity columns

| Field | Content |
|---|---|
| **ID** | WO-HARV-012 |
| **Title** | Harvest WO detail shows Target Quantity and Harvest Quantity |
| **Module** | Work Orders |
| **Role** | Manager |
| **Platform** | Web |
| **Priority** | P1 |
| **Preconditions** | A Harvest WO that has been executed on mobile (status `In Progress`, `Review`, or `Done`) |
| **Steps** | 1. On the **Harvest Work Orders** tab, click **`View Work Order Detail`** on the WO. 2. Read the header and the read-only General fields. 3. Read the **Plots** grid columns. 4. Read the **Assets** grid columns. |
| **Test data** | `WO-1070 \| HWO2` (Task `Pickup`, status `Review`, 100% progress) |
| **Expected result** | Header reads `Work Order: WO-XXXX \| <name>` with the status chip. **Plots** grid includes **`Target Quantity`**; **Assets** grid includes **`Harvest Quantity`** and `Asset Usage UOM`. General shows `Work Order Type` = `Planned`, `Task Type` = `Planned`, `Task` = the harvest operation, `Inspection Template` = `N/A`, and `Approver Comments`. **No Materials grid is rendered.** |
| **Type** | Functional |

---

## TC-13 — Approve a completed Harvest work order

| Field | Content |
|---|---|
| **ID** | WO-HARV-013 |
| **Title** | Approve a Harvest WO from Review to Done via Workorder Completed |
| **Module** | Work Orders |
| **Role** | Manager |
| **Platform** | Web |
| **Priority** | P1 |
| **Preconditions** | A Harvest WO in **`Review`** status (completed on mobile) with recorded harvest quantity |
| **Steps** | 1. **Work Orders** → **Harvest Work Orders** → **Review** chip. 2. Click **`View Work Order Detail`**. 3. Review `Plots` (incl. `Target Quantity`), `Resources`, `Assets` (incl. `Harvest Quantity`), `Plot Details`, `Weather`. 4. Click **`Workorder Completed`** (top-right). 5. Enter text in the approval **`Description`** field. 6. Click **`Approve`**. |
| **Test data** | Comment `Harvest verified — QA <date>` |
| **Expected result** | The status chip changes **`Review` → `Done`**; the WO moves under the **Done** chip on the harvest list; `Approver Comments` on the detail now shows the entered text; recorded machine/asset usage posts to the ERP (verifiable later as a posted journal in D365). |
| **Type** | Smoke / Functional |
| **Note** | The button label is **`Workorder Completed`** here, *not* the Planned flow's `Work Order Completed` — assert the exact live string. |

---

## TC-14 — Weather is logged against harvest plot activity

| Field | Content |
|---|---|
| **ID** | WO-HARV-014 |
| **Title** | Harvest WO detail logs weather readings per plot at activity start and end |
| **Module** | Work Orders |
| **Role** | Manager |
| **Platform** | Web |
| **Priority** | P2 |
| **Preconditions** | A Harvest WO executed on mobile across ≥1 plot |
| **Steps** | 1. Open the WO's detail. 2. Scroll to the **`Weather`** section. 3. Compare its rows against **`Plot Details`** start/end timestamps. |
| **Test data** | `WO-1070` — plots `330`, `331`, `332` |
| **Expected result** | The **Weather** grid shows `Plot`, `Datetime`, `Temprature` [sic — live spelling], `Wind Speed`, `Wind Direction`, `Humidity`, `Conditions`, `Cloud Cover`, with **two rows per plot** whose `Datetime` values match that plot's `Start Date & Time` and `End Date & Time` in `Plot Details`. |
| **Type** | Functional |
| **Cross-ref** | Overlaps [`work-order-weather.md`](./work-order-weather.md) — that plan owns the general weather-logging rules; this case only asserts they hold for harvest WOs. |

---

## TC-15 — Clone a Harvest work order

| Field | Content |
|---|---|
| **ID** | WO-HARV-015 |
| **Title** | Cloning a Harvest WO produces a Draft copy on the Harvest tab |
| **Module** | Work Orders |
| **Role** | Manager |
| **Platform** | Web |
| **Priority** | P3 |
| **Preconditions** | ≥1 Harvest WO exists |
| **Steps** | 1. On the **Harvest Work Orders** tab click **`Clone Work Order`** on a row. 2. Review the pre-filled form. 3. **Submit** → confirm → **Save**. |
| **Test data** | Source WO `WO-1067 \| Test Harvest WO` (Task `Harvest`) |
| **Expected result** | The create form opens pre-filled from the source, with **`Copy of <name>`** as the Work Order Name and the **same harvest Task**. On save the clone lands on the **Harvest Work Orders** tab, never on the main Work Orders tab. |
| **Type** | Functional |

---

## TC-16 — Delete is limited to Draft / To Do

| Field | Content |
|---|---|
| **ID** | WO-HARV-016 |
| **Title** | Delete Workorder is offered only for Draft and To Do harvest WOs |
| **Module** | Work Orders |
| **Role** | Manager |
| **Platform** | Web |
| **Priority** | P2 |
| **Preconditions** | Harvest WOs exist in `Draft`, `To Do`, `In Progress`, `Review`, and `Done` |
| **Steps** | 1. Filter the harvest list by **Draft**; inspect the `Actions` cell. 2. Repeat for **To Do**, **In Progress**, **Review**, **Done**. 3. Delete one Draft harvest WO and confirm. |
| **Test data** | Any Draft harvest WO (e.g. `WO-1050 \| BDH896578`, Task `Shaking`) |
| **Expected result** | The **`Delete Workorder`** action is present on **Draft** and **To Do** rows only, and absent on `In Progress` / `Review` / `Done`. Deleting removes the row and drops the list record count by one. |
| **Type** | Negative / Functional |

---

## TC-17 — The `Select Range` date filter must not block submission

| Field | Content |
|---|---|
| **ID** | WO-HARV-017 |
| **Title** | The broken Task Date Range picker is optional on the Harvest form |
| **Module** | Work Orders |
| **Role** | Manager |
| **Platform** | Web |
| **Priority** | P2 |
| **Preconditions** | A fresh Harvest create form |
| **Steps** | 1. In **Select Plot**, open the **`Task Date Range` / `Select Range`** picker beside the `+` button. 2. Try to navigate months and pick a day. 3. Close it untouched. 4. Add a plot via `+` (`Add Plot`) and complete + **Submit** the WO. |
| **Test data** | Task `Conditioning (1640)` |
| **Expected result** | The picker is a **date-range filter, not the plot selector** — month navigation is disabled and no day is selectable (min/max stuck at `1900-01-01`). Leaving it untouched does **not** block plot selection or submission: the WO saves normally. |
| **Type** | Negative / Regression |
| **Note** | Known defect carried over from the Planned flow. Forcing a value into the underlying `<input>` makes Submit fail server-side with a date-range validation error — do not do it in automation. |

---

## TC-18 — Supervisor survives the form re-render

| Field | Content |
|---|---|
| **ID** | WO-HARV-018 |
| **Title** | Supervisor selected before plot/resource saves is wiped by the re-render |
| **Module** | Work Orders |
| **Role** | Manager |
| **Platform** | Web |
| **Priority** | P2 |
| **Preconditions** | A fresh Harvest create form |
| **Steps** | 1. Fill name/dates/priority, select **Farm\*** and **Task\***. 2. Select **Supervisor\*** **now** (early). 3. Add a plot via `+ (Add Plot)` → **Save**. 4. Re-check the **Supervisor\*** field. 5. Re-select Supervisor and **Submit**. |
| **Test data** | Task `Hulling & Drying (1620)`; any active supervisor resource |
| **Expected result** | After the plot save the **`Supervisor*` value is cleared** by the re-render and `Submit` is disabled again. Re-selecting Supervisor last re-enables `Submit` and the WO saves with the correct supervisor on its detail view. |
| **Type** | Negative / Regression |
| **Note** | Known behavior, documented in `vannbrosphasetwo-knowledge/work-orders.md`. Automation must select Supervisor last. |

---

## TC-19 — Harvest Central: required fields gate Save Harvest Ticket

| Field | Content |
|---|---|
| **ID** | HARV-TKT-001 |
| **Title** | Create Harvest Ticket cannot be saved until all required fields are set |
| **Module** | Harvest Central |
| **Role** | Supervisor / Manager |
| **Platform** | Web |
| **Priority** | P1 |
| **Preconditions** | Logged in; harvesting enabled; Site `Colusa` / Season `Crop Year 2026` |
| **Steps** | 1. Open **Harvest Central** from the top nav. 2. Click **`Create Harvest Ticket`**. 3. Observe **`Save Harvest Ticket`** on the empty form. 4. Fill the required fields one at a time, re-checking the button after each. |
| **Test data** | Field/Variety from the grid (e.g. Field `288`, Variety `MONTEREY`); driver, truck and trailer plates from the tenant's fleet data |
| **Expected result** | Read-only context is pre-filled: **`Grower`** = `Vann Bros - HQ`, **`Season`** = `Crop Year 2026`, **`Hulling Location`** = `YHS`. **`Save Harvest Ticket` is disabled** until all `*` fields are set: **`Field*`**, **`Variety*`**, **`Driver Name*`**, **`Truck License Plate*`**, **`Front Trailer Plate*`**, **`Rear Trailer Plate*`**. Optional fields — `Manual Ticket #` (placeholder `Optional - Enter Paper Ticket Reference`), `Load Type`, `Last Load` / `Split Load` checkboxes, `Fleet`, `Standard Quantity` (placeholder `44,000`), `Attachments` / `Upload Files` — leave the button state unchanged. |
| **Type** | Negative / Functional |

---

## TC-20 — Harvest Central: a saved ticket increments the field's ticket count

| Field | Content |
|---|---|
| **ID** | HARV-TKT-002 |
| **Title** | Saving a harvest ticket updates No Of Harvest Tickets for that field/variety |
| **Module** | Harvest Central |
| **Role** | Supervisor / Manager |
| **Platform** | Web |
| **Priority** | P1 |
| **Preconditions** | TC-19 preconditions; note the target field's current `No Of Harvest Tickets` |
| **Steps** | 1. On **Harvest Central**, record `No Of Harvest Tickets` and `Updated By Date` for the target Field/Variety row. 2. **Create Harvest Ticket** → fill all required fields → **`Save Harvest Ticket`**. 3. Click **`Refresh Data`**. 4. Re-read the row. 5. Click the row's **`View details.`** chevron in `Action`. |
| **Test data** | Field `340`, Variety `ALDRICH` (count `4` at 2026-08-27 capture) |
| **Expected result** | The modal closes on save. After **Refresh Data** the row's **`No Of Harvest Tickets` has increased by 1**, `Updated By Date` reflects today, and `Updated By` shows the current user. The `View details.` chevron opens `/harvest-central/<id>` listing the individual tickets, including the new one. |
| **Type** | Smoke / Functional |

---

## TC-21 — Harvest Central: Cancel discards the ticket

| Field | Content |
|---|---|
| **ID** | HARV-TKT-003 |
| **Title** | Cancelling the Create Harvest Ticket form creates nothing |
| **Module** | Harvest Central |
| **Role** | Supervisor / Manager |
| **Platform** | Web |
| **Priority** | P3 |
| **Preconditions** | On **Harvest Central**; target row's ticket count noted |
| **Steps** | 1. **Create Harvest Ticket** → fill every required field. 2. Click **`Cancel`**. 3. Click **`Refresh Data`** and re-read the row. |
| **Test data** | Same as TC-20 |
| **Expected result** | The form closes without a save toast; the field's **`No Of Harvest Tickets` is unchanged** and no new ticket appears in the row's detail view. |
| **Type** | Negative |

---

## TC-22 — Harvest screens respect the Site / Season context

| Field | Content |
|---|---|
| **ID** | HARV-CTX-001 |
| **Title** | Switching Site or Season re-scopes the harvest WO list and Harvest Central |
| **Module** | Work Orders / Harvest Central |
| **Role** | Manager |
| **Platform** | Web |
| **Priority** | P2 |
| **Preconditions** | Logged in with access to both Sites (`Colusa`, `Yolo`) and Seasons (`Crop Year 2025`, `Crop Year 2026`) |
| **Steps** | 1. With `Site: Colusa` / `Season: Crop Year 2026`, note the record counts on **Harvest Work Orders** and **Harvest Central**. 2. Switch **Season** to `Crop Year 2025`; re-read both. 3. Switch **Site** to `Yolo`; re-read both. 4. Switch back to `Colusa` / `Crop Year 2026`. |
| **Test data** | Baseline: 28 harvest WOs, 54 Harvest Central records (2026-08-27, Colusa / Crop Year 2026) |
| **Expected result** | Both lists re-query on every switch and show only records for the selected Site + Season; counts change and no record from the other context leaks in. Returning to the original context restores the baseline counts. |
| **Type** | Functional / Regression |

---

## Out of scope / follow-ups

- **Mobile execution** — recording harvest progress and `Harvest Quantity` against a WO happens in the mobile app. Cases TC-12/13/14 take a mobile-executed WO as a **precondition**.
- **Harvest ticket → WO linkage** — whether a harvest ticket created in Harvest Central binds to a specific Harvest WO was **not** established during the 2026-08-27 live pass. Needs a product answer before a case can assert it.
- **Role/permission gating** — `Manage Harvest Ticket` and `Manage Harvest ID` exist as Work Order permission checkboxes (see `vannbrosphasetwo-knowledge/users-resources.md`). Negative cases for a user *without* them are worth adding once a suitable test account exists.
- **D365 posting verification** — the ERP side of TC-13 belongs with the journal-review plans.
- **User-facing docs** — the Docusaurus site has no harvest page. A
  `documentation/docs/user-journeys/work-orders/create-harvest-work-order.mdx` (plus a
  `sidebars.ts` entry) would mirror the existing planned/tank-mix journeys. Not written yet.
