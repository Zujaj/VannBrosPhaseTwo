# ADO #26191 — Dummy Resource on the Agri Web App with New changes

Source: [dev.azure.com/AgriERPProduct/Vann Brothers/_workitems/edit/26191](https://dev.azure.com/AgriERPProduct/Vann%20Brothers/_workitems/edit/26191)

| Field | Value |
|---|---|
| Work item type | Task |
| State | Done |
| Iteration | `Vann Brothers\Vann Brothers Phase 2` |
| Assigned to | Aqib Shamim |
| Spec | `resources/product-specifications-document/AgriERP FSCM - Dummy Resources v2.pdf` (description links the Dummy Resource document and the D365 FDD for Enhancement 25942) |
| Related | Enhancement **25942** "Dummy Handling in D365 and Farm App Work Orders" (Ready for QA) · Bug **25844** "Incorrect hour distribution for overlapping resource/machine entries across Work Orders and same plots" (Ready for QA) |

## Developer note (Mohsin Aqee, 2026-09-29 19:01)

Deployed to QA (email sent). Dummy Resources v2 is on the QA branch; the migration is applied to
`VannBrosFinOpsQADB`.

**Implemented**

- Mobile Start/Resume Job creates a **shift per plot**: crews, headcount, machines, time window. Many
  shifts per plot are allowed.
- The **server** calculates hours as headcount × standard hours.
- Machines are booked for the shift window and cannot be double-used.
- Mobile corrections: change headcount, remove crew, delete shift, attach/detach machine.
- New web API **`api/DummyShift/*`**: plot cards, shift list, edit, delete, history, posting checks
  (see `.claude/skills/vannbrosphasetwo-vann-api-qa/reference/DummyShift.md`, 20 operations).
- Full history log. Shifts sync back to Firebase.

**Impact areas (regression)**

1. **Spent Hours** (`GET api/WorkOrder/HourLogs`): new fields; dummy hours read differently. Test with
   normal and old-style dummy resources.
2. **`WorkOrderHourLogs` table**: 4 new columns; one index changed from unique to non-unique. Test
   normal hour log create, edit, void, approve.
3. **Work order sync to mobile (ComAX)**: the job now also writes shift data. Confirm normal work orders
   still reach the app.
4. **Start Job for normal resources (ComAX)**: one line added to the existing flow. Test a Start Job with
   named resources only.
5. **Hours distribution across plots (Bug 25844)**: shift hours are now excluded from the acre-weighted
   split. Confirm the old behaviour is unchanged.
6. **Old dummy resources (Enh 25942)**: still live and untouched. Confirm they still work.

## QA notes

- Test cases: `playwright/test-plans/authenticated/dummy-resources.md` (impact areas → DRI-01..06).
- The web form has no `No Of Resource` input. That is by design in v2: the quantity is entered on mobile at
  Start Job (PSD Figure 1, Manager journey steps 6–8). ADO #26454, filed on this, was a QA error
  (FINDINGS #47, withdrawn).
