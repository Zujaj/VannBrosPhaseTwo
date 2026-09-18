# Work Orders — Inspection flow

Creating an **Inspection** Work Order: an inspection operation that requires an Inspection Template and uses **plot + resources only** — no materials, assets, or tank mixing. Shared facts (lifecycle, list, common form fields, approval, toasts) live in [`work-orders.md`](./work-orders.md).

## Flow

1. Log in.
2. **Work Orders** tab → **Inspection Work Orders** sub-tab → **Create New Work Orders**.
3. Set dates, **Priority**, **Farm**, **Operation** (an inspection task), **Inspection Template\*** (e.g. `Growth Inspection 4 to 6 Weeks After…`). Template must be **Enabled** to appear (see `templates.md`).
4. **Select Plot** → `+ (Add Plot)` → modal → tick plot(s) → `Save`.
5. **Assign Resources** → `+ (Add Resources)` → **Resource Group** dropdown → pick resource → `Save`. (Resources can be Farm Hand or Machine Operator. No materials/assets step.)
6. Select **Supervisor** last → **Submit** → `Create Work Order` confirm dialog → `Save`.

## Differences from Planned

- **Plot & resource info only** — no machines/assets, no tank mixing, no material details.
- **Inspection Template\* is required** — disabled templates don't appear in the dropdown.
- **`Task Type`, `Supervisor`, `Responsible` are disabled** (pre-set) on the inspection form — they are not selected during inspection WO creation.

## Verified live (2026-06-11, VBS tenant)

- Entry: **Work Orders** → **Inspection Work Orders** sub-tab (a button) → **Create New Work Orders**. The form still shows the green **Planned** chip.
- Required template field label is **`Inspection Templates*`** (plural).
- Example data: Operation **`Sampling (1510)`** (the only inspection operation), Inspection Template **`Sampling Template`**, Farm `Vann Farm (VBSF)`.
- Plot add control = `button[title="Add Plot"]` (re-verified 2026-08-26; formerly `Add Block`); its modal heading is **`Select Plots`** — the Planned form's plot modal now shows the same `Select Plots` heading, not the old `Select Blocks`. Resource add = `button[title="Add Resources"]`.
- Submit → **`Create Work Order`** confirm dialog ("Are You Sure You Want To Save The Work Order") → `Save` → toast `Work Order WO-XXXXX | <name> Saved Successfully`.
- A full-screen truck loader (`#f3-overlay-loader`) appears during fetches and intercepts clicks; automation must wait it out between steps.

> Note: the section-gating mechanics (`+ Add Plot` vs `Select Range`, Submit→confirm dialog) match [`work-orders-planned.md`](./work-orders-planned.md), **except** there is no Supervisor step (disabled).
