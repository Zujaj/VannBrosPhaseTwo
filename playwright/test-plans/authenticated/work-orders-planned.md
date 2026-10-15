# Test Plan — Create a Planned Work Order

> One of four WO-type plans. Siblings: [`work-orders-tank-mix.md`](./work-orders-tank-mix.md),
> [`work-orders-inspection.md`](./work-orders-inspection.md),
> [`work-orders-harvest.md`](./work-orders-harvest.md). Shared form mechanics in
> `tests/pages/work-orders.page.ts` (via the `workOrdersPage` fixture in `tests/fixtures.ts`).

- **Spec:** `playwright/tests/authenticated/work-orders-planned.spec.ts`
- **Automation status:** Partial — automated & passing:
  - **WO-PLAN-001 (TC-1)** — **full happy path incl. Submit**, tagged `@mutating` (creates a real WO each run; first verified run = WO-640). Excluded from clean-env runs with `--grep-invert @mutating`.
  - **WO-PLAN-001 (open-form check)** — open Create form, assert "Create New Work Order" heading + Planned chip + Submit. Non-mutating.
  - **WO-PLAN-003 (TC-3)** — assert Submit is **disabled** on empty form (validation gate; no row created). Non-mutating.
  - **WO-PLAN-004 (TC-4)** — assert tank-mix params (Mix Method/Per/Unit) gated behind **Enable Tank Mixing** toggle. Non-mutating.
  - **WO-PLAN-007 (TC-7)** — bulk Planned WO with **30 plots, 5 resources, 5 assets** incl. Submit, tagged `@mutating` (workbook WP-093 30-plot tier, WP-033, WP-043, WP-046).
  - **TC-8 (lifecycle after authoring)** — in a second spec, `work-orders-planned-lifecycle.spec.ts` (`@mutating`, API-seeded): Save As Draft + Draft delete (WP-048, WP-060), Edit pre-populated (WP-053), recall and resubmit twice (WP-050/051/052), delete cancel and confirm on a To Do WO (WP-058/059), and non-mutating checks that Draft/To Do rows offer Delete and started rows don't (WP-056, WP-061). The TC-2 Save-as-Draft case is automated there.
  - **Manual (not automated):** TC-5/TC-6 are precondition-gated + tenant-data-coupled — see their Automation notes. The web `Recall` button is not automated (FINDINGS #56).
- **Source of truth:** `vannbrosphasetwo-knowledge/work-orders-planned.md` + live QA form.
- **Last updated:** 2026-09-11

**Scope:** Web authoring of a Planned (standard) WO through **Submit**. Mobile execution + approval are a separate flow (see WO-APPROVE-001).

---

## TC-1 — Happy path: create + submit Planned WO

| Field | Content |
|---|---|
| **ID** | WO-PLAN-001 |
| **Title** | Create and submit a Planned work order with plot, material, resource, asset |
| **Module** | Work Orders |
| **Role** | Supervisor/Manager |
| **Platform** | Web |
| **Priority** | P1 |
| **Preconditions** | Logged-in; Site/Season selected; ≥1 Farm with plots; ≥1 non-tank-mix Task; Supervisor resource exists |
| **Steps** | 1. **Work Orders** tab → **Create New Work Orders**. 2. Confirm form title **Create New Work Order** + green **Planned** chip. 3. Enter **Work Order Name**. 4. Set **WO Start Date** / **WO End Date**, **Priority** (`High`). 5. Select **Farm**. 6. **Task Type** = `Planned`; **Task** = a non-tank-mix op (e.g. "Almond Preparation (1290)"). 7. Select **Supervisor**. 8. **Select Plot** `+` → check plots → `Save`. 9. **Select Materials** `+` → check → `Save` → enter **Rate** (per acre). 10. **Select Resources** `+` → Resource Group → pick → `Save`. 11. **Select Assets** `+` → pick machine + implement → `Save`. 12. **Submit**. |
| **Test data** | Name `Almond Prep 06/08/2026-1`; Priority `High`; Rate `2` gal |
| **Expected result** | Toast `Work Order WO-XXXXX \| <name> Saved Successfully`; new row in list; status chip **To Do / Queue**; WO visible on mobile |
| **Type** | Smoke / Functional |
| **Automation** | Automated (WO-PLAN-001, `@mutating`). **Mutates QA** — creates a real WO each run. Live findings (2026-06-10): (a) Submit opens a **"Create Work Order" confirm dialog** ("Are You Sure You Want To Save The Work Order") — Submit alone does not save; (b) success toast is title-case **`Saved Successfully`** (not lowercase); (c) selecting **Supervisor before** the plot/material/resource/asset saves gets wiped by re-render — select it **last**; (d) `Almond Preparartion` has **no selectable plots** this season, so the spec uses **`Fertilization (1240)`** + `Vann Farm (VBSF)` + `Agrierp 04 (04)` (supervisor was `Agrierp 02 (02)` until 2026-09-11, when it dropped out of the live Supervisor list); (e) plot is added via the **`+` (Add Plot)** button (re-verified 2026-08-26; formerly "Add Block") → **"Select Plots"** modal, **not** the adjacent "Task Date Range" / "Select Range" date picker — that picker is a separate, currently-broken control (min/max stuck at 1900-01-01, no selectable day) that is not required for submission and must not be touched. |

---

## TC-2 — Save as Draft

| Field | Content |
|---|---|
| **ID** | WO-PLAN-002 |
| **Title** | Save Planned WO as Draft before submit |
| **Role** | Supervisor |
| **Platform** | Web |
| **Priority** | P2 |
| **Preconditions** | Logged-in |
| **Steps** | 1. Create New Work Orders. 2. Fill required fields. 3. Click **Save As** dropdown → Draft. |
| **Expected result** | WO saved; list shows row with **Draft** status chip; not yet visible on mobile |
| **Type** | Functional |

---

## TC-3 — Required-field validation (negative)

| Field | Content |
|---|---|
| **ID** | WO-PLAN-003 |
| **Title** | Submit blocked when required `*` fields empty |
| **Role** | Supervisor |
| **Platform** | Web |
| **Priority** | P1 |
| **Preconditions** | Logged-in; on Create form |
| **Steps** | 1. Leave **Work Order Name**, **dates**, **Priority**, **Farm**, **Operation**, **Supervisor** empty. 2. Observe **Submit** button. |
| **Expected result** | **Submit is disabled** while required `*` fields are empty (cannot submit; no success toast; no new list row). Live: `<button disabled title="Submit">`. |
| **Type** | Negative |
| **Automation** | Automated (WO-PLAN-003) — asserts `Submit` `toBeDisabled()`. Non-mutating. |

---

## TC-4 — Task-type gating (edge)

| Field | Content |
|---|---|
| **ID** | WO-PLAN-004 |
| **Title** | Tank-mix params gated behind Enable Tank Mixing toggle |
| **Role** | Supervisor |
| **Platform** | Web |
| **Priority** | P2 |
| **Preconditions** | Logged-in; on Create form (Planned chip) |
| **Steps** | 1. Create New Work Orders (Planned chip). 2. Inspect Materials grid with **Enable Tank Mixing** OFF. 3. Toggle **Enable Tank Mixing** ON. 4. Re-inspect Materials grid. |
| **Expected result** | OFF (default): Materials grid shows **Rate** + **Usage Unit**; **Mix Method / Per / Unit** absent. ON: **Mix Method / Per / Unit** surface; plain **Usage Unit** replaced. Confirms tank-mix gate. |
| **Type** | Edge / Regression |
| **Automation** | Automated (WO-PLAN-004). Non-mutating. **Note:** live Planned form ships the **Enable Tank Mixing** toggle (gate is the toggle, not Operation-name selection as originally drafted). |

---

## TC-5 — Single Responsible Person (negative)

| Field | Content |
|---|---|
| **ID** | WO-PLAN-005 |
| **Title** | Only one Responsible Person per WO |
| **Role** | Manager |
| **Platform** | Web |
| **Priority** | P3 |
| **Preconditions** | Logged-in as Manager; on Create form |
| **Steps** | 1. Set **Responsible**. 2. Attempt to add a second Responsible. |
| **Expected result** | Only one Responsible allowed at a time (replaces prior) |
| **Type** | Negative |
| **Automation** | Manual. Responsible is a custom search dropdown (no `ng-select` handle); asserting single-select replacement needs two real resource picks → tenant-data-coupled + brittle. Low ROI (P3). |

---

## TC-6 — Empty-state selection modals

| Field | Content |
|---|---|
| **ID** | WO-PLAN-006 |
| **Title** | Empty states render in selection modals |
| **Role** | Supervisor |
| **Platform** | Web |
| **Priority** | P3 |
| **Steps** | 1. Open **Select Plot** / **Select Materials** / **Select Resources** / **Select Assets** with no matches (filter to none). |
| **Expected result** | Shows `No Record Found` (plots), `No materials found`, `No resource found`, `No assets found` |
| **Type** | Functional |
| **Automation** | Manual. Verified live (2026-06-10): the section **+** triggers (`i.icon-add-icon`) are **inert on a fresh form** — modals don't open until **Farm + Operation + Plot** are selected first. Automating requires replicating the full happy-path setup (tenant-data-coupled, same path as TC-1) for a P3 empty-state check → low ROI. |

---

## TC-7 — Bulk Planned WO: 30 plots, several resources and assets

| Field | Content |
|---|---|
| **ID** | WO-PLAN-007 (workbook WP-093, 30-plot tier; also WP-033, WP-043, WP-046) |
| **Title** | Create and submit a Planned work order carrying 30 plots, 5 resources and 5 assets |
| **Module** | Work Orders |
| **Role** | Supervisor/Manager |
| **Platform** | Web |
| **Priority** | P1 |
| **Preconditions** | Logged-in; Site/Season selected; a Farm + non-tank-mix Task with ≥30 selectable plots (Vann Farm (VBSF) / Fertilization (1240) lists 99); ≥5 resources and ≥5 assets |
| **Steps** | 1. **Work Orders** tab → **Create New Work Orders**. 2. Enter **Work Order Name**, **Priority** `High`, **Farm**, **Task**. 3. **Select Plot** `+` → tick 30 plots → `Save`. 4. **Select Materials** `+` → tick one → `Save` → **Rate** `2`. 5. **Select Resources** `+` → tick 5 → `Save`. 6. **Select Assets** `+` → tick 5 → `Save`. 7. **Supervisor**. 8. **Submit** → confirm **Save**. |
| **Test data** | `plannedBulkScenario()` — name `Planned WO 30 Plots <timestamp>`; plots 30, resources 5, assets 5 |
| **Expected result** | Plot grid shows 30 rows and the footer reads **`30 Total Plots`** (**`30 Total Fields`** on the Block build — FINDINGS §2); Resources grid shows 5 rows with Resource Name / Resource Type / Company Name / No Of Resource; Assets grid shows 5 rows with Asset Name / Asset Type / Resource Group / No Of Resource; toast `Work Order WO-XXXXX \| <name> Saved Successfully` without timeout; save response time recorded |
| **Type** | Functional / Performance |
| **Automation** | Automated, `@mutating` — creates a real 30-plot WO each run. First verified run 2026-09-11 on Chromium: **WO-1214** (status To Do; the list shows 29 plot names because two plots are both named `338N`), test time 34 s. Live findings (playwright-cli, 2026-09-11): (a) each selection modal is a `.side-panel` aside; (b) **Select Plots is not paged** — all 99 plots on one scrolling list with an `N Plots Selected` counter and a `99 Total Records` footer, header has a select-all checkbox (avoid it); (c) **Select Resources / Select Assets page at 50 rows** (101 / 557 records) with no select-all, so counts above 50 need paging the spec does not do; (d) re-opening a panel keeps its earlier ticks; (e) once plots are added, the form's plot grid has its own per-row checkbox, so panel rows are scoped to the `.side-panel`. **Not asserted:** asset implements (WP-046) and WP-093's other tiers (10/50/75/100) and thresholds — the spec records the 30-plot save time as a test annotation only. |

---

## TC-8 — Lifecycle after authoring: Draft, Edit, Recall, Delete

| Field | Content |
|---|---|
| **ID** | WO-PLAN-008 (workbook WP-048, WP-050, WP-051, WP-052, WP-053, WP-056, WP-058, WP-059, WP-060, WP-061) |
| **Title** | A Planned WO can be saved as Draft, edited, recalled to Draft, resubmitted and deleted while it is Draft or To Do |
| **Module** | Work Orders |
| **Role** | Manager (Admin) |
| **Platform** | Web (setup and read-back through the API) |
| **Priority** | P1 |
| **Preconditions** | Logged-in admin; Colusa / Crop Year 2026; a To Do Planned WO (the spec seeds one in seconds with `scripts/seed-planned-one.mts`) |
| **Steps** | **Draft:** Create form with name, Priority, Farm, Task, one plot and Supervisor → `Save As` → `Draft` → confirm `Save`. **Edit:** Draft chip → row `Edit Work Order`. **Resubmit:** `Submit` → `Update Work Order` → `Update`. **Recall:** `POST /api/WorkOrder/Recall` with the WO's current `statusID` (2). **Delete:** To Do row `Delete Workorder` → `Cancel`, then again → `Yes`. |
| **Expected result** | Draft toast `Work Order WO-n \| <name> saved successfully` and the row shows under the Draft chip; Edit opens with name, farm, task, supervisor and plot count filled (Farm and Task are disabled inputs, the farm without its code); Update toast `Work Order updated successfully` and the WO returns to To Do; after a recall the API reports Draft and the Draft list shows the row, twice in a row; `Cancel` keeps the row, `Yes` removes it; Draft and To Do rows offer Delete, In Progress / Review / Done rows don't |
| **Type** | Functional |
| **Automation** | Automated, `@mutating` (the Draft test creates a WO through the UI and deletes it; the rest are seeded through the API and deleted in `afterEach`). A full run takes about 1.5 minutes. **Not covered:** the web `Recall` button (it refuses for the admin and sends no request, FINDINGS #56); that an unchanged Update keeps the Priority (seen to drop High to Medium three times, not reproducible on demand, FINDINGS #55); delete blocked with dispatched inventory (WP-062) and cleanup of Planning/Maps (WP-065). |
