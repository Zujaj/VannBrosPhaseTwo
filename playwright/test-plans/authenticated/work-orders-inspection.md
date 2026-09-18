# Test Plan — Create an Inspection Work Order

> One of four WO-type plans. Siblings: [`work-orders-planned.md`](./work-orders-planned.md),
> [`work-orders-tank-mix.md`](./work-orders-tank-mix.md),
> [`work-orders-harvest.md`](./work-orders-harvest.md). Shared form mechanics in
> `tests/pages/work-orders.page.ts` (via the `workOrdersPage` fixture in `tests/fixtures.ts`).

- **Spec:** `playwright/tests/authenticated/work-orders-inspection.spec.ts`
- **Automation status:** **Fully automated & passing (verified live 2026-06-11).**
  - **WO-INSP-002 (open form)** / **WO-INSP-003 (Submit disabled + Inspection Template field present)** — non-mutating. Assert the Inspection Create form mounts via the **Inspection Work Orders** sub-tab and that **Inspection Template\*** is required.
  - **WO-INSP-001 (TC-1, happy path)** — automated (`@mutating`), creates a real Inspection WO each run. Tenant data: Operation `Sampling (1510)`, Inspection Template `Sampling Template`, Farm `Vann Farm (VBSF)`. Excluded from clean-env runs with `--grep-invert @mutating`.
- **Source of truth:** `vannbrosphasetwo-knowledge/work-orders-inspection.md` + live QA form.
- **Last updated:** 2026-06-11

**Scope:** Web authoring of an Inspection WO through **Submit**. Distinct from Planned:
entered via the **Inspection Work Orders** sub-tab, requires an **Inspection Template**, and
uses **plot + resources only** — no materials, assets, or tank mixing.

> ✅ **Verified live 2026-06-11 (full happy path):**
> - **Inspection Work Orders** sub-tab is a `button` (not a tab/link).
> - The Create form still shows the green **Planned** chip; the inspection-specific bits are
>   the required field label **`Inspection Templates*`** (plural) and the disabled fields below.
> - **`Task Type`, `Supervisor`, `Responsible` are DISABLED by design** on the inspection
>   form (pre-set) — do **not** try to select them, unlike the Planned form.
> - Plot add `+` = `button[title="Add Plot"]` (re-verified 2026-08-26; formerly "Add Block");
>   its modal heading is **`Select Plots`** — Planned also shows `Select Plots` now, not
>   `Select Blocks`. Resources add `+` = `button[title="Add Resources"]`.
> - A second button `button[title="Add Plot using map"]` sits next to the plot add trigger —
>   don't confuse the two (the CSS attribute selector above is an exact match, so it's safe).
> - The form also renders an inline "Select Plot" table with its own "Task Date Range" /
>   "Select Range" date-range picker above the modal trigger. That picker is a separate,
>   currently-broken control (min/max stuck at 1900-01-01, no selectable day) — it is not
>   required to add a plot or submit, and must not be touched.
> - The app shows a full-screen truck loader (`#f3-overlay-loader`) during fetches that
>   intercepts clicks — helpers wait it out (`waitForLoaderGone`).

---

## TC-1 — Happy path: create + submit Inspection WO

| Field | Content |
|---|---|
| **ID** | WO-INSP-001 |
| **Title** | Create and submit an Inspection work order (template + plot + resources) |
| **Module** | Work Orders |
| **Role** | Supervisor/Manager |
| **Platform** | Web |
| **Priority** | P1 |
| **Preconditions** | Logged-in; Site/Season selected; ≥1 Farm with plots; ≥1 inspection Operation; ≥1 **Enabled** Inspection Template |
| **Steps** | 1. **Work Orders** → **Inspection Work Orders** sub-tab → **Create New Work Orders**. 2. Enter **Work Order Name**, **Priority**, dates. 3. Select **Farm**; **Operation** = an inspection task. 4. Select **Inspection Templates\***. 5. **Select Plot** `+ (Add Plot)` → tick plot(s) → `Save`. 6. **Assign Resources** `+ (Add Resources)` → Resource Group → pick → `Save`. 7. **Submit** → `Create Work Order` confirm → `Save`. (No Supervisor step — Task Type / Supervisor / Responsible are disabled on this form.) |
| **Test data** | Name `Inspection <date>-1`; Priority `High`; Operation `Sampling (1510)`; Template `Sampling Template`; Farm `Vann Farm (VBSF)` |
| **Expected result** | Toast `Work Order WO-XXXXX \| <name> Saved Successfully`; new row; status **To Do / Queue**. **No** materials/assets/tank-mix sections. |
| **Type** | Smoke / Functional |
| **Automation** | **Automated & passing (verified live 2026-06-11), `@mutating`** — creates a real Inspection WO each run. |

---

## TC-2 — Open the Inspection Create form

| Field | Content |
|---|---|
| **ID** | WO-INSP-002 |
| **Title** | Inspection Work Orders sub-tab opens the Create form |
| **Role** | Supervisor |
| **Platform** | Web |
| **Priority** | P1 |
| **Preconditions** | Logged-in |
| **Steps** | 1. **Work Orders** → **Inspection Work Orders** sub-tab → **Create New Work Orders**. 2. Confirm form mounts (Submit present). |
| **Expected result** | Create form renders with **Submit**. |
| **Type** | Smoke |
| **Automation** | Automated (non-mutating). |

---

## TC-3 — Inspection Template required (negative)

| Field | Content |
|---|---|
| **ID** | WO-INSP-003 |
| **Title** | Submit blocked + Inspection Template field present |
| **Role** | Supervisor |
| **Platform** | Web |
| **Priority** | P1 |
| **Preconditions** | On Inspection Create form |
| **Steps** | 1. On a fresh Inspection form, observe **Submit**. 2. Confirm **Inspection Template\*** field is present (the inspection-specific required field). |
| **Expected result** | **Submit disabled** while required `*` fields (incl. Inspection Template) empty; `Inspection Template` label present. |
| **Type** | Negative |
| **Automation** | Automated (non-mutating). |
