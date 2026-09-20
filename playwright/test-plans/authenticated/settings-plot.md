# Test Plan — Create a Field/Plot from the web app (ADO #26093)

- **Spec:** `playwright/tests/authenticated/settings-plot.spec.ts`
- **Page object:** `playwright/tests/pages/plot.page.ts` (via the `plotPage` fixture)
- **Work item:** [ADO #26093](https://dev.azure.com/AgriERPProduct/Vann%20Brothers/_workitems/edit/26093) — full record in `resources/work-items/26093-create-field.md`
- **Source of truth:** `vannbrosphasetwo-knowledge/references/plots-fields.md`
- **Automation status:** **Written, not yet run green.** Authored 2026-09-20 from the work
  item's screenshots — the stored QA session had expired, so the locators have **not** been
  confirmed against the live DOM. Run `pnpm auth:qa`, then
  `pnpm test:chromium -- --grep @ADO-26093`, and heal what drifts.
- **Last updated:** 2026-09-20

**Scope:** creating a plot/field through **Settings → Plot → Add Plot** on the web app, and
its sync relationship with D365 F&O (FinOps). This is new scope: the regression workbook's
`11 Settings` tab (ST-001..ST-040) has no Plot case, so nothing here carries a `@TC:` tag.
Specs are tagged **`@ADO-26093`** — `pnpm coverage` ignores it (it is not a `@TC` tag, so it
cannot orphan), and `--grep @ADO-26093` still runs exactly this set.

> ⚠️ **`Field Code` is capped at 10 characters** (`PlotFieldAPIModel.code`, maxLength 10 —
> vannbrosphasetwo-vann-api-qa skill). Generated test codes must fit inside it; a full epoch
> timestamp does not.
>
> ⚠️ **No teardown.** TC-2 writes a real plot to the shared QA tenant and nothing removes it.
> `DELETE /api/Field/{id}` exists — there is no `pnpm` wrapper for it the way `wo:delete`
> wraps work orders. Delete leftovers by hand, or run clean cycles with
> `--grep-invert @mutating`.
>
> ⚠️ **Coordinates are not part of the create payload.** `PlotFieldAPIModel` has no coordinate
> field at all; geometry is written separately via `PUT /api/Field/{fieldId}/Coordinates`.
> That is the mechanism behind AC #1 — the form can save without them because the create
> endpoint never wanted them.

## Acceptance criteria → coverage

| AC | Criterion | Covered by | Automatable? |
|---|---|---|---|
| **#1** | Coordinates are optional on the **Add Plot** form | TC-1, TC-2 | ✅ fully |
| **#2** | **PlotJobField** service is enabled and functional | TC-5 (enabled), TC-6 (functional) | ⚠️ half — "functional" needs D365 |
| **#3** | Web-created plots sync to FinOps (**AgriERP management > Plots/Fields**) | TC-3 (web half), TC-7 (sync half) | ⚠️ half — FinOps grid is outside this app |
| **#4** | FinOps project against a plot syncs back to the web app | TC-8 | ❌ manual — starts in D365 |

Plus TC-4, the "with limitations" half of the work item's description.

---

## TC-1 — `Coordinate` is the only optional field

| Field | Content |
|---|---|
| **ID** | PLOT-001 |
| **AC** | #1 |
| **Title** | The Add Plot form marks every field required except Coordinate |
| **Module** | Settings → Plot |
| **Role** | Manager / Admin |
| **Platform** | Web |
| **Priority** | P1 |
| **Preconditions** | Logged in; Site + Season selected |
| **Steps** | 1. **Settings** → **Plot**. 2. Click **Add Plot**. 3. Read the label of each control. |
| **Expected result** | `Farms*`, `Field Name*`, `Field Code*`, `Irrigation Method*`, `Irrigation Sources*`, `Total Area*` all carry `*`. **`Coordinate` does not**, and its textarea renders empty. |
| **Type** | Functional |
| **Automation** | Automated, non-mutating |

---

## TC-2 — Save a plot with no coordinates

| Field | Content |
|---|---|
| **ID** | PLOT-002 |
| **AC** | #1 |
| **Title** | A plot saves successfully with the Coordinate box left blank |
| **Role** | Manager / Admin |
| **Platform** | Web |
| **Priority** | P1 |
| **Preconditions** | Logged in; ≥1 Farm; ≥1 Irrigation Method and Source configured |
| **Steps** | 1. **Settings** → **Plot** → **Add Plot**. 2. Set `Farms` = `Vann Farm (VBSF)`, `Field Name` = `QA Test Plot <stamp>`, `Field Code` = `T<stamp>`, `Irrigation Method` = `Drip (01)`, `Irrigation Sources` = `Glenn-Colusa Irrigation District (GCID)`, `Total Area` = `12`. 3. **Leave `Coordinate` empty.** 4. Confirm the **Summary** panel mirrors the entries. 5. **Save**. 6. Search the grid's `Field Code` column for the new code. |
| **Test data** | `Field Code` ≤ 10 chars — last 6 digits of the epoch second, prefixed `T` |
| **Expected result** | The form closes and the new plot appears in the Plot grid with the entered `Field Name`. No validation error against `Coordinate`. |
| **Type** | Smoke / Functional |
| **Automation** | Automated, **`@mutating`** — creates a real plot each run, no teardown |

---

## TC-3 — The Plot grid carries the identity columns FinOps keys on

| Field | Content |
|---|---|
| **ID** | PLOT-003 |
| **AC** | #3 (web half) |
| **Title** | The Plot grid lists plots with the columns the sync matches on |
| **Role** | Manager / Admin |
| **Platform** | Web |
| **Priority** | P2 |
| **Preconditions** | Logged in; the tenant has plots |
| **Steps** | 1. **Settings** → **Plot**. 2. Clear all column filters. 3. Read the header row and every row's `Field Code` / `Field Name`. |
| **Expected result** | Columns are `Site`, `Farm`, `Field Code`, `Field Name`, `Total Area`, `Irrigation Method`, `Irrigation Sources`. Record count > 0. No row has a blank `Field Code` or `Field Name` — a blank breaks the FinOps match regardless of the batch job. |
| **Type** | Functional |
| **Automation** | Automated, non-mutating |

---

## TC-4 — `Field Code` enforces its 10-character limit

| Field | Content |
|---|---|
| **ID** | PLOT-004 |
| **AC** | description ("create field via form **with limitations**") |
| **Title** | Field Code does not accept more than 10 characters |
| **Role** | Manager / Admin |
| **Platform** | Web |
| **Priority** | P2 |
| **Preconditions** | Logged in |
| **Steps** | 1. **Settings** → **Plot** → **Add Plot**. 2. Type 14 characters into `Field Code`. 3. Read the value back. Do **not** save. |
| **Expected result** | The control holds at most 10 characters — the cap is enforced in the form, not by a server rejection on Save. |
| **Type** | Negative / Boundary |
| **Automation** | Automated, non-mutating |

> If the form accepts 14 and the failure only surfaces on **Save**, that is a defect against
> the work item's "with limitations", not a broken test — raise it on #26093.

---

## TC-5 — The plot sync service is registered and active

| Field | Content |
|---|---|
| **ID** | PLOT-005 |
| **AC** | #2 (enabled half) |
| **Title** | PlotJobField appears in the Sync Console with an active Job Status |
| **Role** | Admin (Sync Console is admin-only) |
| **Platform** | Web |
| **Priority** | P1 |
| **Preconditions** | Logged in as an admin |
| **Steps** | 1. **Sync Console** → **Service Status**. 2. Find the plot sync service by name. 3. Read its `Job Status`. |
| **Expected result** | A row named `PlotJobField` (the work item also writes it `PlotFieldJob`) exists and its `Job Status` reads active/running. |
| **Type** | Functional / Integration |
| **Automation** | Automated, non-mutating |

> This is the check that would have caught the 2026-09-16 regression on this work item: the
> service was **inactive** while plots silently failed to reach FinOps.

---

## TC-6 — The plot sync service actually moves records *(manual)*

| Field | Content |
|---|---|
| **ID** | PLOT-006 |
| **AC** | #2 (functional half) |
| **Title** | PlotJobField picks up new plots within its sync window |
| **Role** | Admin + FinOps access |
| **Platform** | Web + D365 F&O |
| **Priority** | P1 |
| **Preconditions** | TC-2 has created a plot; the FinOps sync console is reachable |
| **Steps** | 1. Note the creation time of the TC-2 plot. 2. Open the FinOps **sync console**. 3. Wait one sync interval (`Synchronization Frequecy` on the Service Status grid — note the product's misspelling). 4. Find a record timestamped **after** the plot's creation time. |
| **Expected result** | The sync console's most recent record is later than the plot's creation time, and the plot is among the records carried. A console whose newest record predates the creation is the 2026-09-16 / 2026-09-18 failure mode. |
| **Type** | Integration |
| **Automation** | **Manual** — the FinOps sync console is a separate system with its own auth |

---

## TC-7 — A web-created plot appears in FinOps *(manual)*

| Field | Content |
|---|---|
| **ID** | PLOT-007 |
| **AC** | #3 (sync half) |
| **Title** | A plot created in the web app appears under AgriERP management > Plots/Fields |
| **Role** | Manager (web) + FinOps user |
| **Platform** | Web + D365 F&O |
| **Priority** | P1 |
| **Preconditions** | TC-2 plot exists; TC-5 passes (service active) |
| **Steps** | 1. Create the plot on the web app (TC-2). 2. In FinOps open **AgriERP management > Plots/Fields**. 3. Search for the `Field Code`. |
| **Test data** | The `Field Code` from TC-2 |
| **Expected result** | The plot is listed in FinOps with the same `Field Name`, `Field Code`, `Total Area`, irrigation method and sources entered on the web form. |
| **Type** | Integration / E2E |
| **Automation** | **Manual** |

> The work item writes this menu path both `Plots/Fields` (description) and `Plots/Field`
> (2026-09-16 comment). Confirm the live D365 label before treating a miss as a defect.

---

## TC-8 — A FinOps project against the plot syncs back to the web app *(manual)*

| Field | Content |
|---|---|
| **ID** | PLOT-008 |
| **AC** | #4 |
| **Title** | A project created in FinOps against a synced plot appears in the web app |
| **Role** | FinOps user + web Manager |
| **Platform** | D365 F&O → Web |
| **Priority** | P1 |
| **Preconditions** | TC-7 passes — the plot is visible in FinOps |
| **Steps** | 1. In FinOps open **Project management and accounting > All Projects > New**. 2. Create a project against the plot from TC-7. 3. On the **Maintain** tab set **Project Stage** to **InProcess**. 4. Return to the web app and locate the project. |
| **Expected result** | The project appears in the web app, associated with the same plot. A project left at its default stage should **not** sync — `InProcess` is what releases it. |
| **Type** | Integration / E2E |
| **Automation** | **Manual** — the flow starts in D365 |

> Worth an explicit negative pass: leave a second project below `InProcess` and confirm it
> does **not** appear. The workbook already has a neighbouring case, PL-004
> ("Verify project-to-plot association"), which this feeds.

---

## Running

```bash
pnpm auth:qa                                  # once — the stored session expires daily
pnpm test:chromium -- --grep @ADO-26093       # all of the above
pnpm test:chromium -- --grep "@ADO-26093" --grep-invert @mutating   # no data written
```
