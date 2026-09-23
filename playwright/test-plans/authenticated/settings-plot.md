# Test Plan — Create a Field/Plot from the web app (ADO #26093)

- **Spec:** `playwright/tests/authenticated/settings-plot.spec.ts`
- **Page object:** `playwright/tests/pages/settings-plot.page.ts` (via the `plotPage` fixture)
- **Work item:** [ADO #26093](https://dev.azure.com/AgriERPProduct/Vann%20Brothers/_workitems/edit/26093) — full record in `resources/work-items/26093-create-field.md`
- **Source of truth:** `vannbrosphasetwo-knowledge/references/plots-fields.md`
- **Automation status:** **Verified live 2026-09-23 — 3 of 4 non-mutating specs pass; TC-4 fails
  on a product defect.** Every locator resolved first time. TC-1, TC-3 and TC-5 pass. TC-4 fails
  because the form accepts a 14-character `Field Code` (FINDINGS.md #30) — the test is correct and
  the product is not. **TC-2 (`@mutating`) has not been run yet**; it is the one write.
- **Last updated:** 2026-09-23

**Scope:** creating a plot/field through **Settings → Plot → Add Plot** on the web app, and its
sync relationship with D365 F&O (FinOps). New scope: the regression workbook's `11 Settings` tab
(ST-001..ST-040) has no Plot case, so nothing here carries a `@TC:` tag. Specs are tagged
**`@ADO-26093`** — `pnpm coverage` ignores it (not a `@TC` tag, so it cannot orphan), and
`--grep @ADO-26093` still runs exactly this set.

## Mutating footprint: one plot, on Colusa

**TC-2 is the only spec here that writes, and it makes one successful submission per run, on
Site `Colusa`.** Its AC #2 half re-submits the *same* farm + code, so on a build that refuses
duplicates nothing further is created.

> ⚠️ On a build where AC #2 is **not yet implemented**, that second submission saves a second
> plot. The test fails — which is the finding — and its message carries the code so the pair can
> be deleted. Run `--grep-invert @mutating` if that risk is not wanted today.
>
> ⚠️ **No teardown.** `DELETE /api/Field/{id}` exists but has no `pnpm` wrapper the way
> `wo:delete` wraps work orders.
>
> ⚠️ TC-2 switches the header **Site** to `Colusa` and restores it in a `finally`. That selector
> is stored server-side per user — an aborted run can leave the account on Colusa, which
> re-scopes every later spec.
>
> ℹ️ **The header Site does not scope the plot grid** (verified live 2026-09-23, FINDINGS.md #31).
> A plot's Site comes from its **Farm** — the Add Plot form has no Site field. "On Colusa" is
> therefore delivered by `Farms* = Vann Farm (VBSF)`, and the header switch only settles which
> farms the dropdown offers.

## Field contract notes

> **`Field Code` is capped at 10 characters** (`PlotFieldAPIModel.code`, maxLength 10 —
> vannbrosphasetwo-vann-api-qa skill). Generated test codes must fit; a full epoch timestamp
> does not.
>
> **Coordinates are not part of the create payload.** `PlotFieldAPIModel` has no coordinate field
> at all; geometry is written separately via `PUT /api/Field/{fieldId}/Coordinates`. That is the
> mechanism behind AC #1 — the form can save without them because the create endpoint never
> wanted them.

## Acceptance criteria → coverage

| AC | Criterion | Covered by | Automatable? |
|---|---|---|---|
| **#1** | Coordinates are optional on the **Add Plot** form | TC-1, TC-2 | ✅ fully |
| **#2** | Duplicate entries not allowed for the same farm | TC-2 | ✅ fully |
| **#3** | **PlotJobField** service is enabled and functional | TC-5 (enabled), TC-6 (functional) | ⚠️ half — "functional" needs D365 |
| **#4** | Web-created plots sync to FinOps (**AgriERP management > Plots/Fields**) | TC-3 (web half), TC-7 (sync half) | ⚠️ half — see below |
| **#5** | FinOps project against a plot syncs back to the web app | TC-8 | ⚠️ half — see below |

Plus TC-4, the "with limitations" half of the work item's description.

### What the FinOps services can and cannot verify

From the `vannbrosphasetwo-finops-api` skill (the D365 `F3Agri*` custom services):

- **Plots/fields expose `create` only.** `F3AgriPlotFieldServices` has no `get` operation in the
  collection, so **there is no read-back call that answers "did the plot reach FinOps"**. AC #4's
  D365 half stays a UI check in **AgriERP management > Plots/Fields** (TC-7).
- **Projects expose `get`.** `F3AgriProjectService/get` returns D365 projects, which is the
  read-back for AC #5 (TC-8) — and, indirectly, evidence the plot exists in D365, since the
  project is created against it.
- **Blocked today: expired TLS certificate on VBS QA.** Node calls fail `CERT_HAS_EXPIRED`
  (checked 2026-09-23), so these are one-offs a person runs, not spec assertions. The skill's
  documented workaround, for this QA host only:

  ```bash
  ! NODE_TLS_REJECT_UNAUTHORIZED=0 node .claude/skills/vannbrosphasetwo-finops-api/scripts/finops.mjs get F3AgriProjectService --size 10000
  ```

- **The token lasts about an hour and is supplied by a person** in
  `playwright/.auth/qa_finops_token.txt`. Check it before relying on it:
  `node .claude/skills/vannbrosphasetwo-finops-api/scripts/finops.mjs check`.

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

## TC-2 — Save a Colusa plot with no coordinates, then reject the duplicate

| Field | Content |
|---|---|
| **ID** | PLOT-002 |
| **AC** | #1 and #2 |
| **Title** | A plot saves with Coordinate blank; re-saving the same code on the same farm is refused |
| **Role** | Manager / Admin |
| **Platform** | Web |
| **Priority** | P1 |
| **Preconditions** | Logged in; Site = `Colusa`; Farm `Vann Farm (VBSF)`; ≥1 Irrigation Method and Source configured |
| **Steps** | 1. **Settings** → **Plot**; switch **Site** to `Colusa`. 2. **Add Plot**. 3. Set `Farms` = `Vann Farm (VBSF)`, `Field Name` = `QA Test Plot <stamp>`, `Field Code` = `T<stamp>`, `Irrigation Method` = `Drip (01)`, `Irrigation Sources` = `Glenn-Colusa Irrigation District (GCID)`, `Total Area` = `12`. 4. **Leave `Coordinate` empty.** 5. Check the **Summary** panel mirrors the entries. 6. **Save**. 7. Search the grid's `Field Code` for the new code. 8. **Add Plot** again; enter the **same farm, name and code**. 9. **Save**. 10. Close the form and re-search the code. |
| **Test data** | `Field Code` ≤ 10 chars — `T` + last 6 digits of the epoch second |
| **Expected result** | **AC #1:** step 6 closes the form and the plot appears in the grid; no validation error against `Coordinate`. **AC #2:** step 9 is refused — the form stays open, an error toast explains why, and step 10 finds exactly **one** row for that code. |
| **Type** | Smoke / Functional / Negative |
| **Automation** | Automated, **`@mutating`** — the suite's single write, one plot per run, no teardown |

---

## TC-3 — The Plot grid carries the identity columns FinOps keys on

| Field | Content |
|---|---|
| **ID** | PLOT-003 |
| **AC** | #4 (web half) |
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

> ❌ **Failing live 2026-09-23 — this is the defect, not the test.** The control keeps all 14
> characters and Angular reports `ng-valid`; the input carries no `maxlength`. See FINDINGS.md #30.
> Whether **Save** then fails server-side is untested — confirming it needs a second submission,
> and the footprint here is held at one. Raise on #26093.

---

## TC-5 — The plot sync service is registered and active

| Field | Content |
|---|---|
| **ID** | PLOT-005 |
| **AC** | #3 (enabled half) |
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
| **AC** | #3 (functional half) |
| **Title** | PlotJobField picks up new plots within its sync window |
| **Role** | Admin + FinOps access |
| **Platform** | Web + D365 F&O |
| **Priority** | P1 |
| **Preconditions** | TC-2 has created a plot; the FinOps sync console is reachable |
| **Steps** | 1. Note the creation time of the TC-2 plot. 2. Open the FinOps **sync console**. 3. Wait one sync interval (`Synchronization Frequecy` on the Service Status grid — note the product's misspelling). 4. Find a record timestamped **after** the plot's creation time. |
| **Expected result** | The sync console's newest record is later than the plot's creation time, and the plot is among the records carried. A console whose newest record predates the creation is the 2026-09-16 / 2026-09-18 failure mode. |
| **Type** | Integration |
| **Automation** | **Manual** — the FinOps sync console is a separate system with its own auth |

---

## TC-7 — A web-created plot appears in FinOps *(manual)*

| Field | Content |
|---|---|
| **ID** | PLOT-007 |
| **AC** | #4 (sync half) |
| **Title** | A plot created in the web app appears under AgriERP management > Plots/Fields |
| **Role** | Manager (web) + FinOps user |
| **Platform** | Web + D365 F&O |
| **Priority** | P1 |
| **Preconditions** | TC-2 plot exists; TC-5 passes (service active) |
| **Steps** | 1. Create the plot on the web app (TC-2). 2. In FinOps open **AgriERP management > Plots/Fields**. 3. Search for the `Field Code`. |
| **Test data** | The `Field Code` from TC-2 |
| **Expected result** | The plot is listed in FinOps with the same `Field Name`, `Field Code`, `Total Area`, irrigation method and sources entered on the web form. |
| **Type** | Integration / E2E |
| **Automation** | **Manual — UI only.** `F3AgriPlotFieldServices` offers `create` but no `get`, so there is no API read-back for this one. |

> The work item writes this menu path both `Plots/Fields` (description) and `Plots/Field`
> (2026-09-16 comment). Confirm the live D365 label before treating a miss as a defect.

---

## TC-8 — A FinOps project against the plot syncs back to the web app

| Field | Content |
|---|---|
| **ID** | PLOT-008 |
| **AC** | #5 |
| **Title** | A project created in FinOps against a synced plot appears in the web app |
| **Role** | FinOps user + web Manager |
| **Platform** | D365 F&O → Web |
| **Priority** | P1 |
| **Preconditions** | TC-7 passes — the plot is visible in FinOps |
| **Steps** | 1. In FinOps open **Project management and accounting > All Projects > New**. 2. Create a project against the plot from TC-7. 3. On the **Maintain** tab set **Project Stage** to **InProcess**. 4. Confirm D365 holds it: `finops.mjs get F3AgriProjectService` (see the TLS note above) and find the project. 5. Return to the web app and locate the project. |
| **Expected result** | `F3AgriProjectService/get` returns the project against the expected plot, and it appears in the web app. A project left below `InProcess` should **not** appear. |
| **Type** | Integration / E2E |
| **Automation** | **Manual**, with step 4 scriptable via the FinOps CLI — the flow starts in D365 |

> Worth an explicit negative pass: leave a second project below `InProcess` and confirm it does
> **not** appear. The workbook already has a neighbouring case, PL-004 ("Verify project-to-plot
> association"), which this feeds.

---

## Running

```bash
pnpm auth:qa                                  # once — the stored session expires daily
pnpm test:chromium -- --grep @ADO-26093       # all of the above; one plot written on Colusa
pnpm test:chromium -- --grep "@ADO-26093" --grep-invert @mutating   # nothing written
```
