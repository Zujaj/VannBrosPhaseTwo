# Test Plan — Create a Tank Mix Work Order

> One of four WO-type plans. Siblings: [`work-orders-planned.md`](./work-orders-planned.md),
> [`work-orders-inspection.md`](./work-orders-inspection.md),
> [`work-orders-harvest.md`](./work-orders-harvest.md). Shared form mechanics in
> `tests/pages/work-orders.page.ts` (via the `workOrdersPage` fixture in `tests/fixtures.ts`).

- **Spec:** `playwright/tests/authenticated/work-orders-tank-mix.spec.ts`
- **Automation status:** Automated.
  - **WO-TANK-003 (toggle gate)** — covered by **WO-PLAN-004** in `work-orders-planned.spec.ts` (the Enable Tank Mixing toggle surfaces Mix Method/Per/Unit). Automated & passing. Not duplicated here.
  - **WO-TANK-002 (Material Template auto-fetch)** — **automated**. Task `Fertilization (1240)` → Material Template `Fertilization` → **Yes** auto-fetches materials. Non-mutating.
  - **WO-TANK-001 (TC-1, happy path)** — **automated** (`@mutating`). Template-driven: Task* → Material Template → **Yes** auto-fills the Select Materials grid (incl. per-material application details), then the shared plot/resources/assets flow → Submit. No manual material entry; the template path carries the application detail, so the old `Application detail is mandatory` blocker does not occur.
- **Source of truth:** `vannbrosphasetwo-knowledge/work-orders-tank-mix.md` + live QA form.
- **Last updated:** 2026-06-11

**Scope:** Web authoring of a Tank Mix WO through **Submit**. Same Create form as Planned with
the **Enable Tank Mixing** toggle ON. Mobile execution + approval are a separate flow.

> ✅ **Tenant data (verified live 2026-06-11):** Task `Fertilization (1240)`,
> Farm `Vann Farm (VBSF)`, Material Template `Fertilization`.
>
> **Key flow facts (from live form):**
> - **Task Type\*** and **Inspection Templates\*** dropdowns are **disabled** on this form.
> - **Order matters:** select **Task\*** FIRST, **then** toggle **Enable Tank Mixing** ON. Selecting a
>   Task **resets the toggle OFF**, so toggling before the Task leaves tank mixing disabled and the
>   **Material Template dropdown empty**.
> - **Tasks are bound to Material Templates** — Task must be set before the Material Template.
> - Selecting a Material Template raises an alert `Are you sure you want to apply material template?` — tap **Yes**.
> - The **Select Materials** grid then **auto-populates** from the template (Material / Rate /
>   Unit / Mix Method / Per) including the application details — no manual material entry.

---

## TC-1 — Happy path: create + submit Tank Mix WO

| Field | Content |
|---|---|
| **ID** | WO-TANK-001 |
| **Title** | Create and submit a Tank Mix work order (toggle ON, Mix Method/Per/Unit set) |
| **Module** | Work Orders |
| **Role** | Supervisor/Manager |
| **Platform** | Web |
| **Priority** | P1 |
| **Preconditions** | Logged-in; Site/Season selected; ≥1 Farm with plots; a **Material Template** bound to the Task |
| **Steps** | 1. **Work Orders** → **Create New Work Orders**. 2. Enter **Work Order Name**, **Priority**, dates; select **Farm**. 3. Select **Task\*** FIRST (Task Type\* + Inspection Templates\* are disabled). 4. Toggle **Enable Tank Mixing** ON → Materials grid shows **Mix Method / Per / Unit** (toggling before the Task fails — Task resets it). 5. Select a **Material Template** → alert `Are you sure you want to apply material template?` → **Yes**. Materials auto-populate. 6. **Select Plot** `+ (Add Plot)` → tick plot(s) → `Save` (the adjacent "Task Date Range" / "Select Range" picker is a separate, currently-broken control — do not touch it). 7. **Select Resources** `+` → tick → `Save`. 8. **Select Assets** `+` → tick → `Save`. 9. **Supervisor** (last). 10. **Submit** → confirm → `Save`. |
| **Test data** | Name `Tank Mix <date>-1`; Priority `High`; Task `Fertilization (1240)`; Template `Fertilization` |
| **Expected result** | Toast `Work Order WO-XXXXX \| <name> Saved Successfully`; new row; status **To Do / Queue** |
| **Type** | Smoke / Functional |
| **Automation** | **Automated** (`@mutating`). |

---

## TC-2 — Material Template auto-fetch (5A path)

| Field | Content |
|---|---|
| **ID** | WO-TANK-002 |
| **Title** | Selecting a Material Template auto-fetches tank-mix materials |
| **Role** | Supervisor |
| **Platform** | Web |
| **Priority** | P2 |
| **Preconditions** | On Create form; Enable Tank Mixing ON; **Task** selected; a Material Template bound to that Task |
| **Steps** | 1. Open Create form; set Farm; toggle Enable Tank Mixing ON; select **Task\***. 2. Pick a template in the **Material Template** dropdown → `Are you sure you want to apply material template?` → **Yes**. 3. Inspect **Select Materials** grid. |
| **Expected result** | Materials auto-populate from the template with Mix Method / Per / Unit; tank-mix info shows in the right panel. |
| **Type** | Functional |
| **Automation** | **Automated** (non-mutating). |

---

## TC-3 — Tank-mix toggle gate (edge)

| Field | Content |
|---|---|
| **ID** | WO-TANK-003 |
| **Title** | Mix Method/Per/Unit gated behind Enable Tank Mixing toggle |
| **Role** | Supervisor |
| **Platform** | Web |
| **Priority** | P2 |
| **Steps** | OFF (default): grid shows Rate + Usage Unit. ON: Mix Method / Per / Unit surface; plain Usage Unit replaced. |
| **Expected result** | Toggle controls the tank-mix material columns. |
| **Type** | Edge / Regression |
| **Automation** | **Automated** — implemented as **WO-PLAN-004** in `work-orders-planned.spec.ts` (the toggle ships on the Planned form). Non-mutating. Not duplicated. |

---

## TC-4 — Edit Tank Mixing Details (Liquid Application)

| Field | Content |
|---|---|
| **ID** | WO-TANK-004 |
| **Title** | Liquid Application fields present in Edit Tank Mixing Details |
| **Role** | Supervisor |
| **Platform** | Web |
| **Priority** | P3 |
| **Preconditions** | Tank-mix WO form with ≥1 material selected |
| **Steps** | 1. Click the material's **Tank Mixing** link → **Additional Information → Edit Tank Mixing Details**. 2. Inspect fields. |
| **Expected result** | Shows `Application Method`, `Total Application Rate (gal/ha)`, `Tank Size (gal)`, `Nozzle Type`, `Droplet Size`, `Preharvest (PHI) (days)`; right panel `Application Type` = Liquid. |
| **Type** | Functional |
| **Automation** | Manual. When a Material Template is applied (WO-TANK-001 path), these application details come pre-filled from the template, so Submit succeeds without opening this sub-modal. This TC verifies the fields when editing them manually. |
