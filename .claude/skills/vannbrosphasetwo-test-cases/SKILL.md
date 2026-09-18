---
name: vannbrosphasetwo-test-cases
description: >-
  Write QA artifacts for VannBrosPhaseTwo — manual test cases, test scenarios, smoke/
  regression checklists, bug reproduction steps, and expected-result tables for
  VannBrosPhaseTwo flows (work orders planned/tank-mix/inspection/harvest, harvest
  tickets, templates, user &
  role setup, journal/posting review in D365, observations/POI, communication
  center, attendance, maps). Use whenever the task is to author, review, or
  expand QA test cases / scenarios / repro steps / acceptance criteria for
  VannBrosPhaseTwo, even if "test case" is phrased as "how would QA verify this", "write
  steps to reproduce", "what should we check for the WO approval flow", or
  "acceptance criteria for inspection templates". Pull exact UI labels, steps,
  statuses, and expected toasts from the vannbrosphasetwo-knowledge skill.
  
---

# VannBrosPhaseTwo Test Cases

Produce precise, executable QA artifacts. **Read the `vannbrosphasetwo-knowledge` skill first** — every step and expected result must use the real nav paths, field labels, statuses, and toast text. The whole value of a test case is that another tester can follow it exactly and know what "pass" looks like; vague wording defeats that.

## Default format

Use this table per test case unless the user wants another format:

| Field | Content |
|---|---|
| **ID** | `WO-001`, `TPL-003`, … (prefix by module) |
| **Title** | Short, action-oriented |
| **Module** | Work Orders / Templates / Users & Roles / Journals / Observations / Comms |
| **Role** | Who performs it (Manager/Supervisor/Responsible Person/Operator) |
| **Platform** | Web / Mobile / D365 |
| **Priority** | P1/P2/P3 |
| **Preconditions** | Logged-in role, required data (e.g. an Enabled inspection template exists) |
| **Steps** | Numbered, using exact nav + labels |
| **Test data** | Concrete values |
| **Expected result** | Observable outcome: exact toast, status chip, new row, posted journal |
| **Type** | Smoke / Functional / Regression / Negative |

For a quick checklist or smoke suite, a compact list of `Step → Expected` lines is fine.

## Output location

Write test plans as human-readable markdown under **`playwright/test-plans/`**, mirroring the Playwright spec tree so each plan traces 1:1 to its automated spec. Keep the runner dir (`playwright/tests/`) pure `.spec.ts` — never put plans there.

```
playwright/
  tests/authenticated/work-orders.spec.ts   ← executable spec (vannbrosphasetwo-playwright)
  test-plans/authenticated/work-orders.md    ← this skill's output
  tests/public/login.spec.ts
  test-plans/public/login.md
```

Mirror the spec's project folder: authenticated flows → `test-plans/authenticated/`, public (logged-out) flows → `test-plans/public/`. Name the file after the feature/area, matching the spec stem (`work-orders.spec.ts` ↔ `work-orders.md`).

Start every plan file with a header block linking it to its spec:

```markdown
# Test Plan — Create a Planned Work Order

- **Spec:** `playwright/tests/authenticated/work-orders.spec.ts` (or _none yet — manual only_)
- **Automation status:** Manual | Partially automated | Automated
- **Source of truth:** `vannbrosphasetwo-knowledge/work-orders.md`
- **Last updated:** <date>
```

Then the test-case tables below. When asked only for a quick answer in chat (not a saved artifact), skip the file and reply inline.

## Rules for good VannBrosPhaseTwo cases

1. **Exact wording.** Steps say **Work Orders → Inspection Work Orders → Create New Work Orders**; expected results quote toasts like `Template created successfully` or status changes like `Review → Done`. Source all of it from `vannbrosphasetwo-knowledge`.
2. **One behavior per case.** Split happy path, validation errors, and permission checks into separate cases.
3. **Observable expected results.** "It works" is not an expected result. Name the toast, the status chip, the new list row, the posted journal cue (e.g. negative quantity on a Return Item journal), or the field that becomes visible/hidden.
4. **Respect platform & role boundaries** (from the knowledge base):
   - WOs are **authored/submitted/approved on web**, **executed on mobile**. Approval (`Work Order Completed → Approve`) is the only path to `Done` and posts consumption to ERP.
   - Observations are **created on mobile**; web configures POI categories and converts observations to WOs.
   - Templates are authored by **Manager** only.
   - Resources/resource groups and journal review live in **D365 F&O**, fed by a sync **batch job**.
5. **Cover the gotchas as negative/edge cases**, e.g.:
   - Inspection WO with a **Disabled** template → template not selectable in dropdown.
   - Standard WO with a tank-mix task (or vice versa) → wrong sections shown.
   - Required fields (`*`) empty → submission blocked.
   - Assigning a D365 Resource to a user before it exists in D365 → not available.
   - Only **one Responsible Person** per WO at a time.
6. **Trace to source** when helpful — reference the flow ("per work-orders.md / Approval flow") so reviewers can check intent.

## Coverage starter (per module)

- **Work Orders:** create Planned, create Tank Mix (via Material Template + manual), create Inspection, submit, mobile-execute (out of web scope — note as precondition), approve → Done, required-field validation, plot/material/resource/asset selection, status filter chips.
- **Templates:** create Attribute (each of the 8 types), create Inspection (Save as Draft vs Save & Publish), Enable/Disable (confirm dialog), Clone (`Copy of …`), create Material (4 tabs, Per Area vs Per Volume).
- **Users & Roles:** create User Enterprise → User Role (permission checkboxes) → User Group (Bypass Attendance, badge) → add Users → assign D365 Resource + Rights to Admin; D365 Resource & Resource Group creation prerequisites.
- **Journals (D365 review):** verify Item, Expense, Transfer (INV-ISSUE), Return Transfer (INV-RECV), Return Item (negative quantity) postings via Show=Posted / sort Z–A.
- **Observations/POI:** create POI category (Active/Visible), view observation, create Planned/Inspection WO from observation.
- **Comms:** new 1:1 chat, group chat, send photo/document/voice note.

## Example

| Field | Content |
|---|---|
| **ID** | WO-APPROVE-001 |
| **Title** | Approve a completed work order and confirm it posts to ERP |
| **Module** | Work Orders | **Role** | Manager | **Platform** | Web | **Priority** | P1 |
| **Preconditions** | A WO in `Review` status (completed on mobile) exists for the current Site/Season |
| **Steps** | 1. Open **Work Orders**. 2. Select the WO and click the **eye icon** (View). 3. Review **General / Plots / Materials / Resources**. 4. Click **Work Order Completed**. 5. In **Approve this Work Order**, enter text in **Description**. 6. Click **Approve**. |
| **Expected result** | The WO status changes to **Done**; recorded material & machine consumption is posted to ERP (verifiable later as a posted Item/Expense journal in D365). |
| **Type** | Functional / P1 smoke |

## Pairs with other skills

- Need to **automate** a case? Hand the plan path to `vannbrosphasetwo-playwright`; it writes the matching spec at the mirrored `playwright/tests/<project>/<feature>.spec.ts` and you flip the plan's **Automation status**.
- Need to **document** the flow for users? Hand it to `vannbrosphasetwo-docs`.
- All three share `vannbrosphasetwo-knowledge` as the fact source.
